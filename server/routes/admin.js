const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');
const Workflow = require('../models/Workflow');
const WorkflowLog = require('../models/WorkflowLog');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// @route   GET /api/admin/users
// @desc    Get all users (excluding admins, optionally)
router.get('/users', async (req, res) => {
  try {
    const roleFilter = req.query.role;
    let query = {};
    if (roleFilter) {
      query.role = roleFilter;
    }
    
    // Select desired fields (password is excluded in schema by default, but we can enforce selection)
    const users = await User.find(query)
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user (student or teacher)
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const validRoles = ['student', 'teacher', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = new User({
      name,
      email,
      password,
      role: role || 'student',
      isVerified: true // Admin-created users are auto-verified
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update a user
router.put('/users/:id', async (req, res) => {
  try {
    const { name, role } = req.body;
    
    const validRoles = ['student', 'teacher', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (name) user.name = name;
    if (role) user.role = role;

    await user.save();

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    // Optionally prevent deleting self
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalExams = await Exam.countDocuments();
    const activeExams = await Exam.countDocuments({ isPublished: true });
    const totalAttempts = await ExamSession.countDocuments();
    
    // Performance data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const performanceData = await ExamSession.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, status: 'submitted' } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          avgScore: { $avg: "$percentage" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Exam status distribution
    const statusDistribution = [
      { name: 'Published', value: activeExams },
      { name: 'Draft', value: totalExams - activeExams }
    ];

    res.json({
      counters: {
        totalStudents,
        totalTeachers,
        activeExams,
        totalAttempts
      },
      performanceData,
      statusDistribution
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/admin/insights
// @desc    Get predictive analytics and smart insights
router.get('/insights', async (req, res) => {
  try {
    // 1. At-Risk Students (Avg < 50% or declining trend)
    const atRiskStudents = await ExamSession.aggregate([
      { $match: { status: 'submitted' } },
      { $group: {
          _id: "$userId",
          avgScore: { $avg: "$percentage" },
          sessions: { $push: { score: "$percentage", date: "$createdAt" } }
      }},
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: "$user" },
      { $project: {
          name: "$user.name",
          email: "$user.email",
          avgScore: 1,
          recentScores: { $slice: ["$sessions", -3] }
      }},
      { $match: { $or: [{ avgScore: { $lt: 50 } }] } }, // Simple threshold for now
      { $limit: 5 }
    ]);

    // 2. Anomalous Exams (Avg score < 40%)
    const anomalies = await ExamSession.aggregate([
      { $match: { status: 'submitted' } },
      { $group: {
          _id: "$examId",
          avgScore: { $avg: "$percentage" },
          totalAttempts: { $sum: 1 }
      }},
      { $lookup: { from: 'exams', localField: '_id', foreignField: '_id', as: 'exam' } },
      { $unwind: "$exam" },
      { $match: { avgScore: { $lt: 45 } } },
      { $project: { title: "$exam.title", avgScore: 1, totalAttempts: 1 } }
    ]);

    // 3. Smart Recommendations
    const recommendations = [];
    if (anomalies.length > 0) {
      recommendations.push({
        type: 'exam_adjustment',
        priority: 'high',
        text: `Exam "${anomalies[0].title}" has low success rate. Suggest reducing difficulty.`,
        action: 'Adjust Difficulty'
      });
    }
    if (atRiskStudents.length > 0) {
      recommendations.push({
        type: 'remedial_support',
        priority: 'medium',
        text: `${atRiskStudents.length} students are performing below threshold. Suggest a bridge course.`,
        action: 'Create Remedial'
      });
    }

    res.json({
      atRiskStudents,
      anomalies,
      recommendations,
      confidenceScore: 0.85 // Simulated confidence level
    });
  } catch (error) {
    console.error('Fetch insights error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/admin/workflows
// @desc    Get all workflows
router.get('/workflows', async (req, res) => {
  try {
    const workflows = await Workflow.find().sort({ createdAt: -1 });
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST /api/admin/workflows
// @desc    Create/Update workflow
router.post('/workflows', async (req, res) => {
  try {
    const { id, name, trigger, condition, action, isEnabled } = req.body;
    let workflow;
    if (id) {
       workflow = await Workflow.findByIdAndUpdate(id, { name, trigger, condition, action, isEnabled }, { new: true });
    } else {
       workflow = new Workflow({ name, trigger, condition, action, isEnabled, createdBy: req.user._id });
       await workflow.save();
    }
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/admin/workflows/history
// @desc    Get workflow execution logs
router.get('/workflows/history', async (req, res) => {
  try {
    const logs = await WorkflowLog.find()
      .populate('workflowId', 'name')
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
