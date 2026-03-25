const mongoose = require('mongoose');

const workflowLogSchema = new mongoose.Schema({
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
  },
  triggerEvent: String,
  triggerData: mongoose.Schema.Types.Mixed,
  actionTaken: String,
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success',
  },
  error: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('WorkflowLog', workflowLogSchema);
