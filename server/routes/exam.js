const express = require('express');
const { body, validationResult } = require('express-validator');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');
const { processTrigger } = require('../utils/workflowEngine');
const { authenticate, authorize } = require('../middleware/auth');
const EncryptionService = require('../utils/encryption');
const router = express.Router();

const isMobileUserAgent = (ua = '') => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi|Mobile/i.test(ua);

const optionSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
  isCorrect: Joi.boolean().optional(),
});

const questionSchema = Joi.object({
  questionText: Joi.string().min(1).max(2000).required(),
  questionType: Joi.string().valid('mcq', 'true-false', 'short-answer', 'coding').required(),
  options: Joi.array().items(optionSchema).default([]),
  imageUrl: Joi.string().allow('', null).default(''),
  correctAnswer: Joi.string().allow('', null).default(''),
  points: Joi.number().min(0).max(100).default(1),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
  explanation: Joi.string().allow('', null).default(''),
  testCases: Joi.array().items(Joi.object({
    input: Joi.string().allow('').default(''),
    expectedOutput: Joi.string().allow('').default(''),
    isPublic: Joi.boolean().default(false),
  })).default([]),
  starterCode: Joi.string().allow('').default(''),
  allowedLanguages: Joi.array().items(Joi.string()).default(['cpp', 'java', 'python', 'c']),
}).custom((value, helpers) => {
  if ((value.questionType === 'mcq' || value.questionType === 'true-false')) {
    if (!value.options || value.options.length < 2) {
      return helpers.message('MCQ/True-False questions require at least 2 options');
    }
    const hasCorrect = value.options.some(o => o.isCorrect === true);
    if (!hasCorrect) {
      return helpers.message('MCQ/True-False questions require a correct option');
    }
  }
  if (value.questionType === 'short-answer' && !String(value.correctAnswer || '').trim()) {
    return helpers.message('Short-answer questions require correctAnswer');
  }
  return value;
});

const examPayloadSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().allow('', null).max(1000),
  duration: Joi.number().integer().min(1).max(480).required(),
  questions: Joi.array().min(1).items(questionSchema).required(),
  passingScore: Joi.number().min(0).max(100).default(40),
  settings: Joi.object({
    shuffleQuestions: Joi.boolean(),
    shuffleOptions: Joi.boolean(),
    showResults: Joi.boolean(),
    allowReview: Joi.boolean(),
    maxAttempts: Joi.number().integer().min(1).max(10),
    requireFullscreen: Joi.boolean(),
    detectTabSwitch: Joi.boolean(),
    detectCopyPaste: Joi.boolean(),
    maxViolations: Joi.number().integer().min(1).max(50),
    webcamRequired: Joi.boolean(),
    encryptQuestions: Joi.boolean(),
    autoSubmitOnViolation: Joi.boolean(),
    preventScreenCapture: Joi.boolean(),
    blockExternalApps: Joi.boolean(),
    disableExtensions: Joi.boolean(),
    enableInactivityDetection: Joi.boolean(),
    inactivityTimeout: Joi.number().integer().min(10).max(3600),
    allowedIPs: Joi.array().items(Joi.string()).default([]),
    allowedDevices: Joi.array().items(Joi.string()).default([]),
  }).default({}),
  accessCode: Joi.string().trim().min(4).max(32).allow('', null),
  scheduledStart: Joi.date().optional(),
  scheduledEnd: Joi.date().optional(),
  isPublished: Joi.boolean().optional(),
  enrolledStudents: Joi.array().items(Joi.string().hex().length(24)).optional(),
}).options({ abortEarly: false, stripUnknown: true });

const examUpdateSchema = examPayloadSchema.fork(
  ['title', 'duration', 'questions'],
  (schema) => schema.optional()
);

const validateExamPayload = (schema, req, res) => {
  const { value, error } = schema.validate(req.body);
  if (error) {
    const details = error.details.map(d => ({ message: d.message, path: d.path }));
    res.status(400).json({ error: 'Validation failed', details });
    return null;
  }
  return value;
};

// Create exam (teachers only)
router.post('/create', authenticate, authorize('teacher', 'admin'), [
  body('title').trim().notEmpty(),
  body('duration').isInt({ min: 1, max: 480 }),
  body('questions').isArray({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const validated = validateExamPayload(examPayloadSchema, req, res);
    if (!validated) return;

    if (Object.prototype.hasOwnProperty.call(validated, 'accessCode')) {
      if (validated.accessCode) {
        validated.accessCodeHash = await bcrypt.hash(validated.accessCode, 12);
      } else {
        validated.accessCodeHash = undefined;
      }
      delete validated.accessCode;
    }

    const exam = new Exam({ ...validated, createdBy: req.user._id });
    await exam.save();
    res.status(201).json({ message: 'Exam created', exam });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create exam.' });
  }
});

// Update exam (teachers only)
router.put('/:id', authenticate, authorize('teacher', 'admin'), [
  body('title').optional().trim().notEmpty(),
  body('duration').optional().isInt({ min: 1, max: 480 }),
  body('questions').optional().isArray({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const exam = await Exam.findById(req.params.id);
    if (!exam || exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const validated = validateExamPayload(examUpdateSchema, req, res);
    if (!validated) return;

    if (Object.prototype.hasOwnProperty.call(validated, 'accessCode')) {
      if (validated.accessCode) {
        validated.accessCodeHash = await bcrypt.hash(validated.accessCode, 12);
      } else {
        validated.accessCodeHash = undefined;
      }
      delete validated.accessCode;
    }

    const updatable = ['title', 'description', 'duration', 'passingScore', 'questions', 'settings', 'accessCodeHash', 'scheduledStart', 'scheduledEnd', 'isPublished', 'enrolledStudents'];
    updatable.forEach((field) => {
      if (validated[field] !== undefined) exam[field] = validated[field];
    });

    await exam.save();
    res.json({ message: 'Exam updated.', exam });
  } catch {
    res.status(500).json({ error: 'Failed to update exam.' });
  }
});

// Get all exams (Admin only)
router.get('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const exams = await Exam.find(query).sort('-createdAt');
    
    // Enrich with statistics
    const enriched = await Promise.all(exams.map(async (exam) => {
      const stats = await ExamSession.aggregate([
        { $match: { examId: exam._id, status: { $in: ['submitted', 'terminated', 'expired'] } } },
        { 
          $group: { 
            _id: null, 
            avgScore: { $avg: "$percentage" }, 
            submissionCount: { $sum: 1 } 
          } 
        }
      ]);

      const s = stats[0] || { avgScore: 0, submissionCount: 0 };
      return {
        ...exam.toObject(),
        avgScore: Math.round((s.avgScore || 0) * 10) / 10,
        submissionCount: s.submissionCount || 0
      };
    }));

    res.json({ exams: enriched });
  } catch (error) {
    console.error('Fetch exams error:', error);
    res.status(500).json({ error: 'Failed to fetch all exams.' }); 
  }
});

// Get all exams for teacher
router.get('/my-exams', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const exams = await Exam.find({ createdBy: req.user._id }).sort('-createdAt');
    res.json({ exams });
  } catch { res.status(500).json({ error: 'Failed to fetch exams.' }); }
});

// Get available exams for students
router.get('/available', authenticate, async (req, res) => {
  try {
    const exams = await Exam.find({
      isPublished: true,
      $or: [
        { enrolledStudents: { $size: 0 } },
        { enrolledStudents: req.user._id },
      ],
    })
      .select('-questions -accessCode')
      .sort('-createdAt');

    const completedStatuses = ['submitted', 'terminated', 'expired'];
    const attemptsByExam = await ExamSession.aggregate([
      {
        $match: {
          userId: req.user._id,
          examId: { $in: exams.map(e => e._id) },
          status: { $in: completedStatuses },
        },
      },
      {
        $group: {
          _id: '$examId',
          count: { $sum: 1 },
        },
      },
    ]);

    const attemptCountMap = new Map(attemptsByExam.map(a => [String(a._id), a.count]));
    const enriched = exams.map(exam => {
      const attemptCount = attemptCountMap.get(String(exam._id)) || 0;
      return {
        ...exam.toObject(),
        attemptCount,
        hasAttempted: attemptCount > 0,
      };
    });

    res.json({ exams: enriched });
  } catch { res.status(500).json({ error: 'Failed to fetch exams.' }); }
});

// Get single exam details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    if (req.user.role === 'student') {
      if (!exam.isPublished) return res.status(403).json({ error: 'Exam not available.' });
      if (exam.enrolledStudents && exam.enrolledStudents.length > 0) {
        const isEnrolled = exam.enrolledStudents.some((id) => id.toString() === req.user._id.toString());
        if (!isEnrolled) return res.status(403).json({ error: 'You are not enrolled for this exam.' });
      }

      // Students don't see correct answers
      const sanitized = exam.toObject();
      sanitized.questions = sanitized.questions.map(q => ({
        ...q,
        options: q.options.map(o => ({ text: o.text, _id: o._id })),
        correctAnswer: undefined,
        explanation: undefined,
      }));
      return res.json({ exam: sanitized });
    }

    if (req.user.role !== 'admin' && exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }
    res.json({ exam });
  } catch { res.status(500).json({ error: 'Failed to fetch exam.' }); }
});

// Start exam session with encryption
router.post('/:id/start', authenticate, authorize('student'), async (req, res) => {
  try {
    if (isMobileUserAgent(req.get('User-Agent') || '')) {
      return res.status(403).json({ error: 'Exam attempts are not allowed on mobile devices. Use desktop/laptop.' });
    }

    const exam = await Exam.findById(req.params.id).select('+accessCode +accessCodeHash');
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });
    if (!exam.isPublished) return res.status(403).json({ error: 'Exam not available.' });

    if (exam.enrolledStudents && exam.enrolledStudents.length > 0) {
      const isEnrolled = exam.enrolledStudents.some((id) => id.toString() === req.user._id.toString());
      if (!isEnrolled) return res.status(403).json({ error: 'You are not enrolled for this exam.' });
    }

    if (exam.accessCodeHash || exam.accessCode) {
      const provided = String(req.body.accessCode || '');
      if (!provided) return res.status(403).json({ error: 'Invalid access code.' });

      if (exam.accessCodeHash) {
        const ok = await bcrypt.compare(provided, exam.accessCodeHash);
        if (!ok) return res.status(403).json({ error: 'Invalid access code.' });
      } else if (exam.accessCode) {
        if (provided !== String(exam.accessCode)) return res.status(403).json({ error: 'Invalid access code.' });
        exam.accessCodeHash = await bcrypt.hash(provided, 12);
        exam.accessCode = undefined;
        await exam.save();
      }
    }

    // IP Restriction
    if (exam.settings.allowedIPs && exam.settings.allowedIPs.length > 0) {
      if (!exam.settings.allowedIPs.includes(req.ip)) {
        await logSecurityEvent('exam.start.ip_blocked', {
          actor: req.user._id,
          resource: 'Exam',
          resourceId: exam._id,
          details: { ip: req.ip, allowed: exam.settings.allowedIPs },
          severity: 'high'
        });
        return res.status(403).json({ error: 'Access denied from this IP address.' });
      }
    }

    // Device/Browser Restriction
    if (exam.settings.allowedDevices && exam.settings.allowedDevices.length > 0) {
      const ua = req.get('User-Agent') || '';
      const isAllowed = exam.settings.allowedDevices.some(d => ua.includes(d));
      if (!isAllowed) {
        await logSecurityEvent('exam.start.device_blocked', {
          actor: req.user._id,
          resource: 'Exam',
          resourceId: exam._id,
          details: { userAgent: ua, allowed: exam.settings.allowedDevices },
          severity: 'high'
        });
        return res.status(403).json({ error: 'Access denied from this device/browser.' });
      }
    }

    // Check for existing active session
    const existing = await ExamSession.findOne({
      examId: exam._id, userId: req.user._id, status: { $in: ['started', 'in_progress'] }
    });
    if (existing) return res.status(409).json({ error: 'Active session exists.', sessionId: existing._id });

    // Check max attempts
    const attempts = await ExamSession.countDocuments({
      examId: exam._id, userId: req.user._id, status: { $in: ['submitted', 'terminated', 'expired'] }
    });
    if (attempts >= exam.settings.maxAttempts) {
      return res.status(403).json({ error: 'Maximum attempts reached.' });
    }

    // Generate session encryption key
    const sessionKey = EncryptionService.generateSessionKey();

    // Create session
    const session = new ExamSession({
      examId: exam._id,
      userId: req.user._id,
      sessionKey,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    await session.save();

    // Prepare questions (shuffle if needed)
    let questions = exam.questions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      questionType: q.questionType,
      imageUrl: q.imageUrl || '',
      options: q.options.map(o => ({ text: o.text, _id: o._id })),
      points: q.points,
      difficulty: q.difficulty,
    }));

    if (exam.settings.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }
    if (exam.settings.shuffleOptions) {
      questions = questions.map(q => ({
        ...q,
        options: q.options.sort(() => Math.random() - 0.5),
      }));
    }

    // Encrypt questions if enabled
    let examData;
    if (exam.settings.encryptQuestions) {
      const { encrypted, hmac } = EncryptionService.encryptExamData(questions, sessionKey);
      examData = { encrypted, hmac, isEncrypted: true };
    } else {
      examData = { questions, isEncrypted: false };
    }

    res.json({
      message: 'Exam session started',
      sessionId: session._id,
      sessionKey,
      examData,
      duration: exam.duration,
      settings: exam.settings,
      totalQuestions: questions.length,
      totalPoints: exam.totalPoints,
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ error: 'Failed to start exam.' });
  }
});

// Submit exam answers
router.post('/:id/submit', authenticate, authorize('student'), async (req, res) => {
  try {
    if (isMobileUserAgent(req.get('User-Agent') || '')) {
      return res.status(403).json({ error: 'Exam submissions are not allowed on mobile devices. Use desktop/laptop.' });
    }

    const { sessionId, encryptedAnswers, answersHMAC, answers } = req.body;
    
    const session = await ExamSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }
    if (['submitted', 'terminated', 'expired'].includes(session.status)) {
      return res.status(409).json({ error: 'Already submitted.' });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });
    if (session.examId.toString() !== exam._id.toString()) {
      return res.status(403).json({ error: 'Session does not match exam.' });
    }

    const elapsed = (Date.now() - session.startedAt.getTime()) / 60000;
    if (exam && elapsed > exam.duration) {
      session.status = 'expired';
      session.terminatedAt = new Date();
      session.terminationReason = 'Time expired';
      await session.save();
      return res.status(403).json({ error: 'Time expired.' });
    }

    const MAX_HEARTBEAT_STALENESS_MS = 90000;
    if (!session.lastHeartbeatAt || (Date.now() - session.lastHeartbeatAt.getTime()) > MAX_HEARTBEAT_STALENESS_MS) {
      return res.status(403).json({ error: 'Proctor heartbeat missing or stale.' });
    }

    // Decrypt answers if encrypted
    let finalAnswers;
    if (exam.settings.encryptQuestions) {
      if (!encryptedAnswers || !answersHMAC) {
        return res.status(400).json({ error: 'Encrypted answers required.' });
      }
      const storedKey = await ExamSession.findById(sessionId).select('+sessionKey');
      finalAnswers = EncryptionService.decryptExamAnswers(encryptedAnswers, answersHMAC, storedKey.sessionKey);
      session.encryptedAnswers = encryptedAnswers;
      session.answersHMAC = answersHMAC;
    } else {
      if (encryptedAnswers && answersHMAC) {
        const storedKey = await ExamSession.findById(sessionId).select('+sessionKey');
        finalAnswers = EncryptionService.decryptExamAnswers(encryptedAnswers, answersHMAC, storedKey.sessionKey);
        session.encryptedAnswers = encryptedAnswers;
        session.answersHMAC = answersHMAC;
      } else {
        finalAnswers = answers;
      }
    }

    if (!Array.isArray(finalAnswers)) {
      return res.status(400).json({ error: 'Invalid answers format.' });
    }

    // Grade the exam
    let score = 0;
    const gradedAnswers = finalAnswers.map(answer => {
      const question = exam.questions.id(answer.questionId);
      if (!question) return { ...answer, isCorrect: false, points: 0 };

      let isCorrect = false;
      if (question.questionType === 'mcq' || question.questionType === 'true-false') {
        const correctOption = question.options.find(o => o.isCorrect);
        isCorrect = correctOption && correctOption._id.toString() === answer.selectedAnswer;
      } else if (question.questionType === 'short-answer') {
        isCorrect = question.correctAnswer &&
          question.correctAnswer.toLowerCase().trim() === String(answer.selectedAnswer).toLowerCase().trim();
      }

      const points = isCorrect ? question.points : 0;
      score += points;
      return { ...answer, isCorrect, points, answeredAt: new Date() };
    });

    const percentage = exam.totalPoints > 0 ? (score / exam.totalPoints) * 100 : 0;

    session.answers = gradedAnswers;
    session.score = score;
    session.percentage = Math.round(percentage * 100) / 100;
    session.passed = percentage >= exam.passingScore;
    session.status = 'submitted';
    session.submittedAt = new Date();
    await session.save();

    // Trigger workflow engine
    processTrigger('exam_submitted', {
      userId: session.userId,
      examId: session.examId,
      percentage: session.percentage,
      passed: session.passed,
      violations: session.totalViolations
    });

    res.json({
      message: 'Exam submitted successfully',
      score, percentage: session.percentage,
      passed: session.passed,
      totalPoints: exam.totalPoints,
      totalViolations: session.totalViolations,
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Failed to submit exam.' });
  }
});

// Get exam results
router.get('/:id/results', authenticate, async (req, res) => {
  try {
    const sessions = await ExamSession.find({ examId: req.params.id, userId: req.user._id })
      .sort('-submittedAt');
    res.json({ results: sessions });
  } catch { res.status(500).json({ error: 'Failed to fetch results.' }); }
});

// Get all results for a teacher's exam
router.get('/:id/all-results', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }
    const sessions = await ExamSession.find({ examId: req.params.id })
      .populate('userId', 'name email')
      .sort('-submittedAt');
    res.json({ results: sessions });
  } catch { res.status(500).json({ error: 'Failed to fetch results.' }); }
});

// Publish/unpublish exam
router.patch('/:id/publish', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }
    exam.isPublished = !exam.isPublished;
    await exam.save();
    res.json({ message: `Exam ${exam.isPublished ? 'published' : 'unpublished'}.`, exam });
  } catch { res.status(500).json({ error: 'Failed to update exam.' }); }
});

// Delete exam (teachers only)
router.delete('/:id', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    await ExamSession.deleteMany({ examId: exam._id });
    await exam.deleteOne();
    res.json({ message: 'Exam deleted.' });
  } catch {
    res.status(500).json({ error: 'Failed to delete exam.' });
  }
});

const { generateCheatingReportPDF, generateExamPerformanceCSV } = require('../utils/reportGenerator');

// ... (rest of imports)

// Get security report (PDF)
router.get('/:id/report/security', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }
    const sessions = await ExamSession.find({ examId: req.params.id })
      .populate('userId', 'name email')
      .sort('-totalViolations');
    
    const buffer = await generateCheatingReportPDF(sessions, exam.title);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=security_report_${exam.title}.pdf`,
    });
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate PDF report.' });
  }
});

// Get performance report (CSV)
router.get('/:id/report/performance', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }
    const sessions = await ExamSession.find({ examId: req.params.id })
      .populate('userId', 'name email')
      .sort('-score');
    
    const buffer = await generateExamPerformanceCSV(sessions);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=performance_report_${exam.title}.csv`,
    });
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate CSV report.' });
  }
});

module.exports = router;
