const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    if (user.isLocked()) {
      return res.status(423).json({ error: 'Account is temporarily locked.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
};

const verifyExamSession = async (req, res, next) => {
  try {
    const ExamSession = require('../models/ExamSession');
    const sessionId = req.params.sessionId || req.body.sessionId;
    
    if (!sessionId) return res.status(400).json({ error: 'Session ID required.' });

    const session = await ExamSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized session access.' });
    }
    if (['terminated', 'expired'].includes(session.status)) {
      return res.status(403).json({ error: 'Session terminated.', reason: session.terminationReason });
    }

    req.examSession = session;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Session verification failed.' });
  }
};

module.exports = { authenticate, authorize, verifyExamSession };
