const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  questionType: {
    type: String,
    enum: ['mcq', 'true-false', 'short-answer', 'coding'],
    required: true,
  },
  options: [{
    text: String,
    isCorrect: Boolean,
  }],
  imageUrl: {
    type: String,
    default: '',
  },
  correctAnswer: {
    type: String,
  },
  points: {
    type: Number,
    default: 1,
    min: 0,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  explanation: String,
  // Coding specific fields
  testCases: [{
    input: String,
    expectedOutput: String,
    isPublic: { type: Boolean, default: false }
  }],
  starterCode: {
    type: String,
    default: ''
  },
  allowedLanguages: {
    type: [String],
    default: ['cpp', 'java', 'python', 'c']
  }
});

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Exam title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  expectedStudentCount: {
    type: Number,
    required: [true, 'Expected student count is required'],
    min: 1,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questions: [questionSchema],
  duration: {
    type: Number, // in minutes
    required: [true, 'Exam duration is required'],
    min: 1,
    max: 480,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  passingScore: {
    type: Number,
    default: 40, // percentage
  },
  settings: {
    shuffleQuestions: { type: Boolean, default: true },
    shuffleOptions: { type: Boolean, default: true },
    showResults: { type: Boolean, default: true },
    allowReview: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: 1 },
    requireFullscreen: { type: Boolean, default: true },
    strictFullscreen: { type: Boolean, default: true }, // STRICT MODE: Immediate termination on fullscreen exit
    detectTabSwitch: { type: Boolean, default: true },
    detectCopyPaste: { type: Boolean, default: true },
    maxViolations: { type: Number, default: 5 },
    webcamRequired: { type: Boolean, default: false },
    encryptQuestions: { type: Boolean, default: true },
    autoSubmitOnViolation: { type: Boolean, default: false },
    preventScreenCapture: { type: Boolean, default: true },
    blockExternalApps: { type: Boolean, default: true },
    disableExtensions: { type: Boolean, default: false },
  },
  accessCode: {
    type: String,
    select: false,
  },
  accessCodeHash: {
    type: String,
    select: false,
  },
  scheduledStart: Date,
  scheduledEnd: Date,
  isPublished: {
    type: Boolean,
    default: false,
  },
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

// Calculate total points before saving
examSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0);
  }
  next();
});

// Index for efficient queries
examSchema.index({ createdBy: 1, isPublished: 1 });
examSchema.index({ scheduledStart: 1, scheduledEnd: 1 });

module.exports = mongoose.model('Exam', examSchema);
