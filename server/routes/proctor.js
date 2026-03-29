const express = require('express');
const ExamSession = require('../models/ExamSession');
const Exam = require('../models/Exam');
const { authenticate, authorize, verifyExamSession } = require('../middleware/auth');
const { proctorLimiter } = require('../middleware/rateLimit');
const router = express.Router();

const isMobileUserAgent = (ua = '') => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi|Mobile/i.test(ua);

// Report a violation
router.post('/violation/:sessionId', proctorLimiter, authenticate, authorize('student'), verifyExamSession, async (req, res) => {
  try {
    if (isMobileUserAgent(req.get('User-Agent') || '')) {
      return res.status(403).json({ error: 'Exam actions are not allowed on mobile devices.' });
    }

    const { type, details, severity } = req.body;
    const session = req.examSession;

    session.violations.push({ type, details, severity: severity || 'medium', timestamp: new Date() });
    session.totalViolations += 1;

    // Check if max violations exceeded
    const exam = await Exam.findById(session.examId);
    if (exam && exam.settings.maxViolations && session.totalViolations >= exam.settings.maxViolations) {
      if (exam.settings.autoSubmitOnViolation) {
        // Calculate score for terminated exam based on answered questions
        if (session.answers && session.answers.length > 0) {
          let score = 0;
          session.answers.forEach(answer => {
            const question = exam.questions.id(answer.questionId);
            if (!question) return;

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
            answer.isCorrect = isCorrect;
            answer.points = points;
          });

          const percentage = exam.totalPoints > 0 ? (score / exam.totalPoints) * 100 : 0;
          session.score = score;
          session.percentage = Math.round(percentage * 100) / 100;
          session.passed = percentage >= exam.passingScore;
        } else {
          // No answers submitted, score is 0
          session.score = 0;
          session.percentage = 0;
          session.passed = false;
        }

        session.status = 'terminated';
        session.terminatedAt = new Date();
        session.terminationReason = `Maximum violations exceeded (${session.totalViolations})`;
        await session.save();
        return res.json({
          warning: 'EXAM_TERMINATED',
          message: 'Exam terminated due to excessive violations.',
          totalViolations: session.totalViolations,
        });
      }
    }

    await session.save();
    
    res.json({
      totalViolations: session.totalViolations,
      maxViolations: exam ? exam.settings.maxViolations : 5,
      remaining: exam ? exam.settings.maxViolations - session.totalViolations : 0,
      warning: session.totalViolations >= (exam?.settings.maxViolations || 5) - 2 
        ? 'APPROACHING_LIMIT' : null,
    });
  } catch (error) {
    console.error('Violation report error:', error);
    res.status(500).json({ error: 'Failed to report violation.' });
  }
});

// Update fullscreen status
router.post('/fullscreen/:sessionId', proctorLimiter, authenticate, authorize('student'), verifyExamSession, async (req, res) => {
  try {
    if (isMobileUserAgent(req.get('User-Agent') || '')) {
      return res.status(403).json({ error: 'Exam actions are not allowed on mobile devices.' });
    }

    const session = req.examSession;
    session.isFullscreen = req.body.isFullscreen;
    session.lastFullscreenAt = new Date();
    if (!req.body.isFullscreen) {
      session.focusLostCount += 1;
    }
    await session.save();
    
    res.json({ isFullscreen: session.isFullscreen, focusLostCount: session.focusLostCount });
  } catch { res.status(500).json({ error: 'Failed to update status.' }); }
});

// Heartbeat - keep session alive and monitor
router.post('/heartbeat/:sessionId', proctorLimiter, authenticate, authorize('student'), async (req, res) => {
  try {
    if (isMobileUserAgent(req.get('User-Agent') || '')) {
      return res.status(403).json({ error: 'Exam actions are not allowed on mobile devices.' });
    }

    const session = await ExamSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }
    
    if (session.status === 'terminated') {
      return res.json({ status: 'terminated', reason: session.terminationReason });
    }
    if (session.status === 'submitted') {
      return res.json({ status: 'submitted' });
    }

    // Check if exam time has expired
    const exam = await Exam.findById(session.examId);
    const elapsed = (Date.now() - session.startedAt.getTime()) / 60000;
    if (exam && elapsed > exam.duration) {
      session.status = 'expired';
      session.terminatedAt = new Date();
      session.terminationReason = 'Time expired';
      await session.save();
      return res.json({ status: 'expired', reason: 'Time expired' });
    }

    session.status = 'in_progress';
    session.lastHeartbeatAt = new Date();
    await session.save();
    
    res.json({
      status: session.status,
      totalViolations: session.totalViolations,
      elapsedMinutes: Math.floor(elapsed),
      remainingMinutes: exam ? Math.max(0, Math.ceil(exam.duration - elapsed)) : 0,
    });
  } catch { res.status(500).json({ error: 'Heartbeat failed.' }); }
});

// Get session violations (for teacher review)
router.get('/violations/:sessionId', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const session = await ExamSession.findById(req.params.sessionId)
      .populate('userId', 'name email')
      .populate('examId', 'title');
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const exam = await Exam.findById(session.examId._id || session.examId);
    if (!exam || exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }
    
    res.json({
      student: session.userId,
      exam: session.examId,
      violations: session.violations,
      totalViolations: session.totalViolations,
      status: session.status,
      startedAt: session.startedAt,
      submittedAt: session.submittedAt,
      terminatedAt: session.terminatedAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      focusLostCount: session.focusLostCount,
      isFlagged: session.isFlagged,
      browserFingerprint: session.browserFingerprint,
    });
  } catch { res.status(500).json({ error: 'Failed to fetch violations.' }); }
});

module.exports = router;
