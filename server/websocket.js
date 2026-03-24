/**
 * WebSocket Proctoring Server
 * Real-time violation streaming to teacher dashboards
 */
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const Exam = require('./models/Exam');
const ExamSession = require('./models/ExamSession');

const setupWebSocket = (server) => {
  let WebSocketServer;
  try {
    const ws = require('ws');
    WebSocketServer = ws.Server;
  } catch (e) {
    console.warn('ws package not installed. WebSocket disabled. Run: npm install ws');
    return null;
  }

  const wss = new WebSocketServer({ server, path: '/ws/proctor' });
  const teachers = new Map();
  const students = new Map();

  wss.on('connection', (ws, req) => {
    let clientType = null;
    let clientId = null;
    ws.isAlive = true;
    ws.isAuthenticated = false;
    ws.subscriptions = new Set();
    ws._rate = { count: 0, windowStart: Date.now() };
    ws.on('pong', () => { ws.isAlive = true; });

    // Try cookie-based auth first (HttpOnly access token)
    try {
      const cookies = cookie.parse(req?.headers?.cookie || '');
      const accessToken = cookies.accessToken;
      if (accessToken) {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        ws.user = { id: decoded.id, role: decoded.role, email: decoded.email };
        ws.isAuthenticated = true;
      }
    } catch {
      // Ignore cookie auth errors; client may authenticate via message
    }

    const authTimeout = setTimeout(() => {
      if (!ws.isAuthenticated) {
        try { ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' })); } catch {}
        ws.close();
      }
    }, 10000);

    ws.on('message', (raw) => {
      const now = Date.now();
      if (now - ws._rate.windowStart > 5000) {
        ws._rate.windowStart = now;
        ws._rate.count = 0;
      }
      ws._rate.count += 1;
      if (ws._rate.count > 25) {
        try { ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded' })); } catch {}
        return ws.close();
      }

      try {
        const msg = JSON.parse(raw);
        const sendError = (message) => ws.send(JSON.stringify({ type: 'error', message }));

        if (msg.type === 'auth') {
          const token = msg.token;
          if (!token) return sendError('Token required');
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            ws.user = { id: decoded.id, role: decoded.role, email: decoded.email };
            ws.isAuthenticated = true;
            clearTimeout(authTimeout);
            ws.send(JSON.stringify({ type: 'authenticated', role: ws.user.role }));
            return;
          } catch {
            return sendError('Invalid token');
          }
        }

        if (!ws.isAuthenticated) {
          return sendError('Authenticate first');
        }

        const isTeacher = ws.user.role === 'teacher' || ws.user.role === 'admin';
        const isStudent = ws.user.role === 'student';

        (async () => {
          switch (msg.type) {
            case 'teacher:subscribe': {
              if (!isTeacher) return sendError('Insufficient permissions');
              if (!msg.examId) return sendError('examId required');
              const exam = await Exam.findById(msg.examId);
              if (!exam) return sendError('Exam not found');
              if (ws.user.role !== 'admin' && exam.createdBy.toString() !== ws.user.id) {
                return sendError('Unauthorized exam subscription');
              }
              clientType = 'teacher'; clientId = msg.examId;
              if (!teachers.has(msg.examId)) teachers.set(msg.examId, new Set());
              teachers.get(msg.examId).add(ws);
              ws.subscriptions.add(msg.examId);
              ws.send(JSON.stringify({ type: 'subscribed', examId: msg.examId }));
              break;
            }
            case 'student:register': {
              if (!isStudent) return sendError('Insufficient permissions');
              if (!msg.sessionId) return sendError('sessionId required');
              const session = await ExamSession.findById(msg.sessionId);
              if (!session) return sendError('Session not found');
              if (session.userId.toString() !== ws.user.id) return sendError('Unauthorized session');
              clientType = 'student'; clientId = msg.sessionId;
              students.set(msg.sessionId, ws);
              ws.send(JSON.stringify({ type: 'registered', sessionId: msg.sessionId }));
              break;
            }
            case 'violation': {
              if (!isStudent) return sendError('Insufficient permissions');
              if (!msg.sessionId) return sendError('sessionId required');
              const session = await ExamSession.findById(msg.sessionId);
              if (!session) return sendError('Session not found');
              if (session.userId.toString() !== ws.user.id) return sendError('Unauthorized session');
              const payload = {
                type: 'violation:live', sessionId: msg.sessionId, examId: session.examId?.toString(),
                studentName: msg.studentName, violationType: msg.violationType,
                details: msg.details, severity: msg.severity,
                timestamp: new Date().toISOString(), totalViolations: msg.totalViolations,
              };
              const watchers = teachers.get(String(session.examId));
              if (watchers) watchers.forEach(t => { if (t.readyState === 1) t.send(JSON.stringify(payload)); });
              break;
            }
            case 'status': {
              if (!isStudent) return sendError('Insufficient permissions');
              if (!msg.sessionId) return sendError('sessionId required');
              const session = await ExamSession.findById(msg.sessionId);
              if (!session) return sendError('Session not found');
              if (session.userId.toString() !== ws.user.id) return sendError('Unauthorized session');
              const payload = {
                type: 'status:update', sessionId: msg.sessionId, examId: session.examId?.toString(),
                studentName: msg.studentName, status: msg.status, timestamp: new Date().toISOString(),
              };
              const watchers = teachers.get(String(session.examId));
              if (watchers) watchers.forEach(t => { if (t.readyState === 1) t.send(JSON.stringify(payload)); });
              break;
            }
            case 'teacher:warn': {
              if (!isTeacher) return sendError('Insufficient permissions');
              if (!msg.sessionId) return sendError('sessionId required');
              const session = await ExamSession.findById(msg.sessionId);
              if (!session) return sendError('Session not found');
              const exam = await Exam.findById(session.examId);
              if (!exam) return sendError('Exam not found');
              if (ws.user.role !== 'admin' && exam.createdBy.toString() !== ws.user.id) {
                return sendError('Unauthorized');
              }
              const sw = students.get(msg.sessionId);
              if (sw && sw.readyState === 1) sw.send(JSON.stringify({ type: 'warning', message: msg.message, from: 'proctor', timestamp: new Date().toISOString() }));
              break;
            }
            case 'teacher:terminate': {
              if (!isTeacher) return sendError('Insufficient permissions');
              if (!msg.sessionId) return sendError('sessionId required');
              const session = await ExamSession.findById(msg.sessionId);
              if (!session) return sendError('Session not found');
              const exam = await Exam.findById(session.examId);
              if (!exam) return sendError('Exam not found');
              if (ws.user.role !== 'admin' && exam.createdBy.toString() !== ws.user.id) {
                return sendError('Unauthorized');
              }
              const sw = students.get(msg.sessionId);
              if (sw && sw.readyState === 1) sw.send(JSON.stringify({ type: 'terminate', reason: msg.reason || 'Terminated by proctor', timestamp: new Date().toISOString() }));
              break;
            }
            default:
              sendError('Unknown type');
          }
        })().catch((err) => {
          ws.send(JSON.stringify({ type: 'error', message: 'Server error' }));
          console.error('WebSocket error:', err);
        });
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      if (clientType === 'teacher' && clientId) {
        const set = teachers.get(clientId);
        if (set) { set.delete(ws); if (set.size === 0) teachers.delete(clientId); }
      } else if (clientType === 'student' && clientId) {
        students.delete(clientId);
      }
      ws.subscriptions.forEach((examId) => {
        const set = teachers.get(examId);
        if (set) { set.delete(ws); if (set.size === 0) teachers.delete(examId); }
      });
    });
  });

  // Heartbeat to clean dead connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  wss.on('close', () => clearInterval(interval));

  console.log('🔌 WebSocket proctoring server ready on /ws/proctor');
  return wss;
};

module.exports = { setupWebSocket };
