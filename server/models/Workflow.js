const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  trigger: {
    type: String,
    enum: ['exam_submitted', 'score_calculated', 'user_registered', 'exam_published'],
    required: true,
  },
  condition: {
    field: String,
    operator: {
      type: String,
      enum: ['eq', 'lt', 'gt', 'contains'],
    },
    value: mongoose.Schema.Types.Mixed,
  },
  action: {
    type: {
      type: String,
      enum: ['send_notification', 'assign_remedial', 'publish_results', 'log_event'],
      required: true,
    },
    params: mongoose.Schema.Types.Mixed,
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Workflow', workflowSchema);
