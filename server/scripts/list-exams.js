/**
 * Script to list all exams in the database
 * Useful for finding exam IDs before deletion
 * 
 * Usage: node scripts/list-exams.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');
const User = require('../models/User');

const listExams = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_exam_db');
    console.log('Connected to MongoDB\n');

    const exams = await Exam.find()
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    if (exams.length === 0) {
      console.log('No exams found in the database.');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`=== Found ${exams.length} Exam(s) ===\n`);

    for (const exam of exams) {
      const sessionCount = await ExamSession.countDocuments({ examId: exam._id });
      const submitted = await ExamSession.countDocuments({ examId: exam._id, status: 'submitted' });
      const terminated = await ExamSession.countDocuments({ examId: exam._id, status: 'terminated' });
      const inProgress = await ExamSession.countDocuments({ 
        examId: exam._id, 
        status: { $in: ['started', 'in_progress'] } 
      });

      console.log('─'.repeat(60));
      console.log(`📝 ${exam.title}`);
      console.log(`ID: ${exam._id}`);
      console.log(`Created by: ${exam.createdBy?.name || 'Unknown'} (${exam.createdBy?.email || 'N/A'})`);
      console.log(`Duration: ${exam.duration} minutes`);
      console.log(`Questions: ${exam.questions.length}`);
      console.log(`Total Points: ${exam.totalPoints}`);
      console.log(`Passing Score: ${exam.passingScore}%`);
      console.log(`Created: ${new Date(exam.createdAt).toLocaleString()}`);
      console.log(`\nSessions:`);
      console.log(`  Total: ${sessionCount}`);
      console.log(`  Submitted: ${submitted}`);
      console.log(`  Terminated: ${terminated}`);
      console.log(`  In Progress: ${inProgress}`);
      console.log('');
    }

    console.log('─'.repeat(60));
    console.log('\nTo clear a specific exam:');
    console.log('  node scripts/clear-specific-exam.js <examId>');
    console.log('\nTo clear all exam data:');
    console.log('  node scripts/clear-exam-data.js');
    console.log('  node scripts/clear-exam-data.js --all  (includes exams)');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error listing exams:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

listExams();
