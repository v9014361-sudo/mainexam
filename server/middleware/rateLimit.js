const rateLimit = require('express-rate-limit');

const createLimiter = (options) => rateLimit({
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  ...options,
});

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Increased for 400+ concurrent students
  message: { error: 'Too many requests. Please slow down.' },
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100, // Increased for testing and development
  message: { error: 'Too many login attempts. Please try again later.' },
});

const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

const refreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many refresh attempts. Please try again later.' },
});

const proctorLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 8000, // Increased for 400+ concurrent students with active proctoring
  message: { error: 'Too many proctoring requests. Please slow down.' },
});

module.exports = {
  apiLimiter,
  authLimiter,
  registerLimiter,
  refreshLimiter,
  proctorLimiter,
};
