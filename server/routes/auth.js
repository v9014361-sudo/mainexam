const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { authLimiter, registerLimiter, refreshLimiter } = require('../middleware/rateLimit');
const { logSecurityEvent } = require('../utils/securityLogger');
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
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
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
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logSecurityEvent('auth.login.invalid_email', { email, ip: req.ip });
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

    user.loginAttempts = 0; user.lockUntil = undefined; user.lastLogin = new Date();
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);
    res.json({ message: 'Login successful', user: user.toJSON() });
  } catch (error) {
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

module.exports = router;
