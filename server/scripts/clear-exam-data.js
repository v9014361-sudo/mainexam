/**
 * Script to clear all previously conducted exam data
 * This will remove:
 * - All exam sessions (student attempts, results, violations)
 * - Optionally: All exams themselves
 * 
 * Usage:
 * - Clear only sessions: node scripts/clear-exam-data.js
 * - Clear sessions and exams: node scripts/clear-exam-data.js --all
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

const clearExamData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_exam_db');
    console.log('Connected to MongoDB\n');

    const clearAll = process.argv.includes('--all');

    // Get counts before deletion
    const sessionCount = await ExamSession.countDocuments();
    const examCount = await Exam.countDocuments();

    console.log('=== Current Database Status ===');
    console.log(`Total Exam Sessions: ${sessionCount}`);
    console.log(`Total Exams: ${examCount}\n`);

    if (sessionCount === 0 && examCount === 0) {
      console.log('Database is already empty. Nothing to clear.');
      await mongoose.connection.close();
      rl.close();
      process.exit(0);
    }

    // Confirm deletion
    console.log('⚠️  WARNING: This action cannot be undone!\n');
    
    if (clearAll) {
      console.log('You are about to delete:');
      console.log(`- ${sessionCount} exam sessions (all student attempts and results)`);
      console.log(`- ${examCount} exams (all exam definitions)\n`);
    } else {
      console.log('You are about to delete:');
      console.log(`- ${sessionCount} exam sessions (all student attempts and results)`);
      console.log(`- Exams will be preserved\n`);
    }

    const confirmation = await question('Type "DELETE" to confirm: ');

    if (confirmation !== 'DELETE') {
      console.log('\nOperation cancelled.');
      await mongoose.connection.close();
      rl.close();
      process.exit(0);
    }

    console.log('\n🗑️  Starting deletion process...\n');

    // Delete exam sessions
    if (sessionCount > 0) {
      console.log('Deleting exam sessions...');
      const sessionResult = await ExamSession.deleteMany({});
      console.log(`✓ Deleted ${sessionResult.deletedCount} exam sessions`);
    }

    // Delete exams if --all flag is present
    if (clearAll && examCount > 0) {
      console.log('Deleting exams...');
      const examResult = await Exam.deleteMany({});
      console.log(`✓ Deleted ${examResult.deletedCount} exams`);
    }

    console.log('\n=== Cleanup Complete ===');
    console.log('Database has been cleared successfully.');
    
    // Show final counts
    const finalSessionCount = await ExamSession.countDocuments();
    const finalExamCount = await Exam.countDocuments();
    console.log(`\nRemaining Exam Sessions: ${finalSessionCount}`);
    console.log(`Remaining Exams: ${finalExamCount}`);

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

clearExamData();
