/**
 * Script to clear data for a specific exam
 * This will remove all sessions for a particular exam
 * 
 * Usage: node scripts/clear-specific-exam.js <examId>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ExamSession = require('../models/ExamSession');
const Exam = require('../models/Exam');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const clearSpecificExam = async () => {
  try {
    const examId = process.argv[2];

    if (!examId) {
      console.log('Usage: node scripts/clear-specific-exam.js <examId>');
      console.log('\nTo find exam IDs, you can:');
      console.log('1. Check the URL when viewing an exam in the browser');
      console.log('2. Use MongoDB Compass or mongo shell to list exams');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_exam_db');
    console.log('Connected to MongoDB\n');

    // Verify exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      console.log(`❌ Exam with ID "${examId}" not found.`);
      await mongoose.connection.close();
      rl.close();
      process.exit(1);
    }

    // Get session count for this exam
    const sessionCount = await ExamSession.countDocuments({ examId });

    console.log('=== Exam Details ===');
    console.log(`Title: ${exam.title}`);
    console.log(`Created by: ${exam.createdBy}`);
    console.log(`Total Sessions: ${sessionCount}\n`);

    if (sessionCount === 0) {
      console.log('No sessions found for this exam. Nothing to clear.');
      await mongoose.connection.close();
      rl.close();
      process.exit(0);
    }

    // Show session breakdown
    const submitted = await ExamSession.countDocuments({ examId, status: 'submitted' });
    const terminated = await ExamSession.countDocuments({ examId, status: 'terminated' });
    const inProgress = await ExamSession.countDocuments({ examId, status: { $in: ['started', 'in_progress'] } });

    console.log('Session Breakdown:');
    console.log(`- Submitted: ${submitted}`);
    console.log(`- Terminated: ${terminated}`);
    console.log(`- In Progress: ${inProgress}\n`);

    console.log('⚠️  WARNING: This will delete all student attempts and results for this exam!');
    console.log('The exam itself will be preserved.\n');

    const confirmation = await question('Type "DELETE" to confirm: ');

    if (confirmation !== 'DELETE') {
      console.log('\nOperation cancelled.');
      await mongoose.connection.close();
      rl.close();
      process.exit(0);
    }

    console.log('\n🗑️  Deleting exam sessions...\n');

    const result = await ExamSession.deleteMany({ examId });
    
    console.log('=== Cleanup Complete ===');
    console.log(`✓ Deleted ${result.deletedCount} exam sessions for "${exam.title}"`);
    console.log('The exam definition has been preserved.');

    await mongoose.connection.close();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    await mongoose.connection.close();
    rl.close();
    process.exit(1);
  }
};

clearSpecificExam();
