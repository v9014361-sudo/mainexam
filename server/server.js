require('dotenv').config();
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const morgan = require('morgan');
const path = require('path');
const { setupWebSocket } = require('./websocket');
const { apiLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exam');
const proctorRoutes = require('./routes/proctor');
const adminRoutes = require('./routes/admin');
const compilerRoutes = require('./routes/compiler');

const app = express();
app.set('trust proxy', 1);

// In development, allow HTTP startup even when MongoDB is temporarily unreachable.
const ALLOW_START_WITHOUT_DB =
  process.env.ALLOW_START_WITHOUT_DB !== 'false' && process.env.NODE_ENV !== 'production';

// ─── SECURITY MIDDLEWARE ─────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      styleSrcAttr: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: true,
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// CORS
const configuredClientUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
const normalizeOrigin = (value) => String(value || '').replace(/\/+$/, '');
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  ...configuredClientUrls.map(normalizeOrigin),
]);

const isPrivateNetworkOrigin = (origin) =>
  /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(origin);

const isLocalhostOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const isVercelOrigin = (origin) =>
  /^https:\/\/.*\.vercel\.app$/.test(origin);

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server requests or tools without browser origin header
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);

    // Allow explicitly configured origins
    if (allowedOrigins.has(normalizedOrigin)) return callback(null, true);

    // Allow all Vercel preview and production URLs
    if (isVercelOrigin(normalizedOrigin)) return callback(null, true);

    // In development, allow LAN/mobile origins (e.g. http://192.168.1.5:3000)
    if (process.env.NODE_ENV !== 'production' && isPrivateNetworkOrigin(normalizedOrigin)) {
      return callback(null, true);
    }

    // In development, allow localhost loopback origins on any port (e.g. :3001, :5173)
    if (process.env.NODE_ENV !== 'production' && isLocalhostOrigin(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));
app.options('/api/*', cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(hpp());

// Optimize for high concurrency
app.set('etag', false);
app.set('x-powered-by', false);

// Rate limiting (global API)
app.use('/api', apiLimiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Fast-fail DB-backed APIs while disconnected instead of waiting for Mongoose timeouts.
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState === 1) return next();

  return res.status(503).json({
    error: 'Database is unavailable. Server is running in degraded mode.',
    dbStatus: 'disconnected',
  });
});

// ─── ROUTES ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/proctor', proctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/compiler', compilerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    security: 'E2E Encrypted',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    degradedMode: mongoose.connection.readyState !== 1,
  });
});

// Root status route for quick browser checks.
app.get('/', (req, res) => {
  res.json({
    message: 'Secure Exam backend is running',
    apiHealth: '/api/health',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    degradedMode: mongoose.connection.readyState !== 1,
  });
});

// Serve React in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(err.status || 500).json({ error: message });
});

// ─── DATABASE & SERVER START ─────────────────────────────────
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_exam_db';
const MONGOOSE_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 150, // Support 400+ concurrent students
  minPoolSize: 30,
  maxIdleTimeMS: 30000,
  compressors: ['zlib'],
};
const INITIAL_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 30000;

let reconnectDelayMs = INITIAL_RETRY_DELAY_MS;
let reconnectTimer = null;
let isConnecting = false;
let serverStarted = false;

// Attach WebSocket proctoring
setupWebSocket(httpServer);

const startHttpServer = () => {
  if (serverStarted) return;
  serverStarted = true;
  httpServer.listen(PORT, () => {
    console.log(`Secure Exam Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`WebSocket: ws://localhost:${PORT}/ws/proctor`);
  });
};

const scheduleReconnect = (reason) => {
  if (reconnectTimer || isConnecting) return;
  console.warn(`MongoDB reconnect scheduled (${reason}) in ${Math.round(reconnectDelayMs / 1000)}s`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectToDatabase();
  }, reconnectDelayMs);
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RETRY_DELAY_MS);
};

const connectToDatabase = async () => {
  if (isConnecting) return;
  isConnecting = true;
  try {
    await mongoose.connect(MONGODB_URI, MONGOOSE_OPTIONS);
    reconnectDelayMs = INITIAL_RETRY_DELAY_MS;
    console.log('MongoDB connected');
    startHttpServer();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    if (ALLOW_START_WITHOUT_DB) {
      startHttpServer();
    }
    scheduleReconnect('connect failure');
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
  scheduleReconnect('disconnected');
});

mongoose.connection.on('reconnected', () => {
  reconnectDelayMs = INITIAL_RETRY_DELAY_MS;
  console.log('MongoDB reconnected');
});

process.on('SIGINT', async () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  await mongoose.connection.close();
  process.exit(0);
});

void connectToDatabase();

module.exports = app;


