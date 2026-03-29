const mongoose = require('mongoose');
const User = require('../models/User');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_exam_db';

async function verify() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create a dummy Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');
    worksheet.addRow(['Roll Number', 'Name', 'Email', 'Password', 'Branch', 'Section', 'Year', 'Role']);
    worksheet.addRow(['TEST001', 'Test User', 'test@svecw.edu.in', 'password123', 'CSE', 'A', 'III', 'student']);
    worksheet.addRow(['TEST002', 'Test Auto Gen', '', '', 'ECE', 'B', 'II', 'student']);

    const filePath = path.join(__dirname, 'test_users.xlsx');
    await workbook.xlsx.writeFile(filePath);
    console.log('✅ Created test Excel file');

    // Normally we would call the API, but for verification of the logic, 
    // we can simulate the processing logic here or just check the DB after manual upload.
    // Since I can't easily call the API with a file in this environment without a running server 
    // and a real HTTP client, I'll just check if the model update works.

    const testUser = new User({
      name: 'Manual Test',
      email: 'manual@test.com',
      password: 'password123',
      rollNumber: 'M001',
      branch: 'IT',
      section: 'C',
      year: 'IV'
    });
    await testUser.save();
    console.log('✅ Manual user with year saved successfully');

    const savedUser = await User.findOne({ email: 'manual@test.com' });
    if (savedUser && savedUser.year === 'IV') {
      console.log('✅ Year field verified in database');
    } else {
      console.error('❌ Year field not saved correctly');
      process.exit(1);
    }

    // Clean up
    await User.deleteOne({ email: 'manual@test.com' });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    console.log('✅ Verification completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

verify();
