const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const ExcelJS = require('exceljs');
const User = require('../models/User');
const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');
const { authenticate, authorize } = require('../middleware/auth');
const { authLimiter, registerLimiter, refreshLimiter } = require('../middleware/rateLimit');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { logSecurityEvent } = require('../utils/securityLogger');
const auditLogMiddleware = require('../middleware/auditMiddleware');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

const generateAccessToken = (user) => jwt.sign(
  { id: user._id, role: user.role, email: user.email },
  process.env.JWT_SECRET, { expiresIn: '1h' }
);
const generateRefreshToken = (user) => jwt.sign(
  { id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }
);

const accessCookieOptions = {
  httpOnly: true,
  secure: true, // Always true for cross-domain cookies
  sameSite: 'none', // Required for cross-domain (Vercel to Render)
  maxAge: 60 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: true, // Always true for cross-domain cookies
  sameSite: 'none', // Required for cross-domain (Vercel to Render)
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, accessCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

// Register
router.post('/register', [
  registerLimiter,
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('role').optional().isIn(['student', 'teacher']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role } = req.body;
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered.' });

    const user = new User({ name, email, password, role: role || 'student' });
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({ message: 'Registration successful', user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// Login
router.post('/login', [
  authLimiter,
  body('email').notEmpty().withMessage('Email or Roll Number is required'),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    
    // Try to find user by email or roll number
    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    // If not found by email, try roll number
    if (!user) {
      user = await User.findOne({ rollNumber: email.trim() }).select('+password');
    }
    
    if (!user) {
      logSecurityEvent('auth.login.invalid_credentials', { identifier: email, ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    if (user.isLocked()) {
      logSecurityEvent('auth.login.locked', { userId: user._id.toString(), ip: req.ip });
      return res.status(423).json({ error: 'Account locked. Try later.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      logSecurityEvent('auth.login.invalid_password', { userId: user._id.toString(), ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Reset login attempts on success
    user.loginAttempts = 0; 
    user.lockUntil = undefined; 
    user.lastLogin = new Date();

    // Check for 2FA
    if (user.isTwoFactorEnabled) {
      // In a real app, you might issue a temporary "pre-auth" token here
      return res.json({ 
        message: '2FA required', 
        requiresTwoFactor: true,
        userId: user._id 
      });
    }

    // Check for multi-login (preventing same user on different devices)
    const currentSession = {
      token: generateAccessToken(user),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      createdAt: new Date(),
    };
    
    // For this implementation, we allow only ONE active session per user role
    // If it's an admin, we might be stricter.
    if (user.role === 'admin' && user.activeSessions.length > 0) {
      logSecurityEvent('auth.multi_login_prevented', {
        actor: user._id,
        resource: 'User',
        details: { prevSession: user.activeSessions[0], newIp: req.ip },
        severity: 'high'
      });
      // Optionally clear other sessions:
      user.activeSessions = []; 
      user.refreshTokens = [];
    }
    
    const accessToken = currentSession.token;
    const refreshToken = generateRefreshToken(user);
    
    user.activeSessions.push(currentSession);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);
    res.json({ message: 'Login successful', user: user.toJSON() });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Refresh token
router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required.' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.some(t => t.token === refreshToken)) {
      if (user) { user.refreshTokens = []; await user.save(); }
      clearAuthCookies(res);
      logSecurityEvent('auth.refresh.invalid', { userId: user?._id?.toString(), ip: req.ip });
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
    const newAccess = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user);
    user.refreshTokens.push({ token: newRefresh });
    await user.save();
    setAuthCookies(res, newAccess, newRefresh);
    res.json({ message: 'Token refreshed' });
  } catch { return res.status(401).json({ error: 'Invalid refresh token.' }); }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      req.user.refreshTokens = req.user.refreshTokens.filter(t => t.token !== refreshToken);
      await req.user.save();
    }
    clearAuthCookies(res);
    res.json({ message: 'Logged out.' });
  } catch { res.status(500).json({ error: 'Logout failed.' }); }
});

// Get current user
router.get('/me', authenticate, (req, res) => res.json({ user: req.user.toJSON() }));

// ─── 2FA ENDPOINTS ──────────────────────────────────────────

// Enable 2FA - Step 1: Generate Secret
router.post('/2fa/setup', authenticate, auditLogMiddleware('auth.2fa.setup', 'User'), async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `SecureExam:${req.user.email}` });
    req.user.twoFactorSecret = secret.base32;
    await req.user.save();

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCode: qrCodeUrl });
  } catch (error) {
    res.status(500).json({ error: '2FA setup failed' });
  }
});

// Enable 2FA - Step 2: Verify and Activate
router.post('/2fa/verify', authenticate, auditLogMiddleware('auth.2fa.verify', 'User'), async (req, res) => {
  const { token } = req.body;
  const verified = speakeasy.totp.verify({
    secret: req.user.twoFactorSecret,
    encoding: 'base32',
    token,
  });

  if (verified) {
    req.user.isTwoFactorEnabled = true;
    await req.user.save();
    res.json({ message: '2FA enabled successfully' });
  } else {
    res.status(400).json({ error: 'Invalid 2FA token' });
  }
});

// Login with 2FA
router.post('/login/2fa', [
  authLimiter,
  body('userId').notEmpty(),
  body('token').notEmpty(),
], async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user || !user.isTwoFactorEnabled) return res.status(401).json({ error: 'Invalid request' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });

    if (!verified) return res.status(401).json({ error: 'Invalid 2FA token' });

    // Success - generate tokens
    user.lastLogin = new Date();
    user.activeSessions = []; // Clear other sessions on 2FA login for extra security
    user.refreshTokens = [];
    
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    user.activeSessions.push({
      token: accessToken,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      createdAt: new Date(),
    });
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);
    res.json({ message: 'Login successful', user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: '2FA login failed' });
  }
});

// Get users by role (Admin only)
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(query).sort('name').select('-password -refreshTokens -activeSessions');
    
    // Enrich with statistics
    const enriched = await Promise.all(users.map(async (u) => {
      let stats = { count: 0, avg: 0 };
      if (u.role === 'student') {
        const result = await ExamSession.aggregate([
          { $match: { userId: u._id, status: { $in: ['submitted', 'terminated', 'expired'] } } },
          { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$percentage' } } }
        ]);
        if (result[0]) stats = { count: result[0].count, avg: Math.round(result[0].avg) };
      } else if (u.role === 'teacher') {
        const count = await Exam.countDocuments({ createdBy: u._id });
        stats = { count, avg: 0 };
      }
      
      return { ...u.toObject(), stats };
    }));
    
    res.json({ users: enriched });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Admin: Create single user

// Admin: Create single user
router.post('/users', authenticate, authorize('admin'), [
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['student', 'teacher', 'admin']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role, rollNumber, branch, section } = req.body;
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered.' });

    const user = new User({ name, email, password, role, rollNumber, branch, section });
    await user.save();

    res.status(201).json({ message: 'User created successfully', user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// Bulk upload users (Admin only)
router.post('/users/bulk-upload', authenticate, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { role } = req.body;
    const targetRole = role || 'student';

    const workbook = new ExcelJS.Workbook();
    if (req.file.originalname.endsWith('.csv')) {
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(req.file.buffer);
      await workbook.csv.read(bufferStream);
    } else {
      await workbook.xlsx.load(req.file.buffer);
    }
    
    const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).json({ error: 'Invalid file: No worksheet found.' });
    }

    const usersToCreate = [];
    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: []
    };

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      // exceljs cell values can be objects (formula, rich text) or simple values
      const getValue = (cell) => {
        if (!cell.value) return '';
        if (typeof cell.value === 'object') {
          return cell.value.text || cell.value.result || cell.value.toString();
        }
        return cell.value.toString();
      };

      const rollNumber = getValue(row.getCell(1));
      const name = getValue(row.getCell(2));
      const email = getValue(row.getCell(3));
      const password = getValue(row.getCell(4));
      const branch = getValue(row.getCell(5));
      const section = getValue(row.getCell(6));
      const year = getValue(row.getCell(7));
      const roleFromFile = getValue(row.getCell(8))?.toLowerCase().trim();

      if (!name && !email && !password) return; // Skip empty rows

      results.total++;

      // If email or password is missing, we can try to generate it or skip
      let finalEmail = email;
      let finalPassword = password;

      if (!name) {
        results.failed++;
        results.errors.push(`Row ${rowNumber}: Missing name.`);
        return;
      }

      if (!finalEmail && rollNumber) {
        // Simple auto-generate email if missing
        finalEmail = `${rollNumber.toLowerCase()}@svecw.edu.in`;
      }

      if (!finalPassword && rollNumber) {
        // Simple auto-generate password if missing
        finalPassword = rollNumber;
      }

      if (!finalEmail || !finalPassword) {
        results.failed++;
        results.errors.push(`Row ${rowNumber}: Missing Email or Password.`);
        return;
      }

      // Determine the final role
      let finalRole = targetRole;
      if (roleFromFile && ['student', 'teacher', 'admin', 'faculty'].includes(roleFromFile)) {
        finalRole = roleFromFile === 'faculty' ? 'teacher' : roleFromFile;
      }

      usersToCreate.push({ rollNumber, name, email: finalEmail, password: finalPassword, branch, section, year, role: finalRole });
    });

    for (const userData of usersToCreate) {
      try {
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          results.failed++;
          results.errors.push(`${userData.email}: Email already registered.`);
          continue;
        }

        const user = new User(userData);
        await user.save();
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`${userData.email}: ${err.message}`);
      }
    }

    res.json({
      message: `Bulk upload completed. ${results.success} users created successfully.`,
      results
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Bulk upload failed. Please ensure the file is a valid Excel document.' });
  }
});

module.exports = router;
