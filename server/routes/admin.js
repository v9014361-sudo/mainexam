const express = require('express');
const router = express.Router();
const User = require('../models/User');
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

module.exports = router;
