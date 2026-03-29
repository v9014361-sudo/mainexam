const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'tab_switch',
      'window_blur',
      'fullscreen_exit',
      'copy_attempt',
      'paste_attempt',
      'right_click',
      'screenshot_attempt',
      'devtools_open',
      'external_app_detected',
      'extension_detected',
      'multiple_monitor',
      'screen_share_detected',
      'keyboard_shortcut',
      'browser_resize',
      'idle_timeout',
    ],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  details: String,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
});

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  selectedAnswer: mongoose.Schema.Types.Mixed,
  isCorrect: Boolean,
  points: Number,
  answeredAt: Date,
});

const examSessionSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sessionKey: {
    type: String,
    required: true,
    select: false,
  },
  status: {
    type: String,
    enum: ['started', 'in_progress', 'submitted', 'terminated', 'expired'],
    default: 'started',
  },
  answers: [answerSchema],
  encryptedAnswers: String,
  answersHMAC: String,
  violations: [violationSchema],
  totalViolations: {
    type: Number,
    default: 0,
  },
  score: Number,
  percentage: Number,
  passed: Boolean,
  isFlagged: {
    type: Boolean,
    default: false,
  },
  remarks: String,
  editHistory: [{
    oldScore: Number,
    newScore: Number,
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  startedAt: {
    type: Date,
    default: Date.now,
  },
  submittedAt: Date,
  terminatedAt: Date,
  terminationReason: String,
  ipAddress: String,
  userAgent: String,
  browserFingerprint: String,
  lastHeartbeatAt: Date,
  lastFullscreenAt: Date,
  isFullscreen: {
    type: Boolean,
    default: false,
  },
  focusLostCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound index to prevent multiple active sessions
examSessionSchema.index({ examId: 1, userId: 1, status: 1 });

module.exports = mongoose.model('ExamSession', examSessionSchema);
