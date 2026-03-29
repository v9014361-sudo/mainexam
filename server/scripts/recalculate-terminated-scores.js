/**
 * Migration script to recalculate scores for terminated exam sessions
 * Run this once to fix existing terminated sessions that don't have scores
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ExamSession = require('../models/ExamSession');
const Exam = require('../models/Exam');

const recalculateScores = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_exam_db');
    console.log('Connected to MongoDB');

    // Find all terminated sessions without scores
    const terminatedSessions = await ExamSession.find({
      status: 'terminated',
      $or: [
        { score: null },
        { score: { $exists: false } },
        { percentage: null },
        { percentage: { $exists: false } }
      ]
    }).populate('examId');

    console.log(`Found ${terminatedSessions.length} terminated sessions without scores`);

    let updated = 0;
    let skipped = 0;

    for (const session of terminatedSessions) {
      if (!session.examId) {
        console.log(`Skipping session ${session._id} - exam not found`);
        skipped++;
        continue;
      }

      const exam = session.examId;

      // Calculate score based on answered questions
      if (session.answers && session.answers.length > 0) {
        let score = 0;
        
        session.answers.forEach(answer => {
          const question = exam.questions.id(answer.questionId);
          if (!question) return;

          let isCorrect = false;
          if (question.questionType === 'mcq' || question.questionType === 'true-false') {
            const correctOption = question.options.find(o => o.isCorrect);
            isCorrect = correctOption && correctOption._id.toString() === answer.selectedAnswer;
          } else if (question.questionType === 'short-answer') {
            isCorrect = question.correctAnswer &&
              question.correctAnswer.toLowerCase().trim() === String(answer.selectedAnswer).toLowerCase().trim();
          }

          const points = isCorrect ? question.points : 0;
          score += points;
          answer.isCorrect = isCorrect;
          answer.points = points;
        });

        const percentage = exam.totalPoints > 0 ? (score / exam.totalPoints) * 100 : 0;
        session.score = score;
        session.percentage = Math.round(percentage * 100) / 100;
        session.passed = percentage >= exam.passingScore;
        
        await session.save();
        console.log(`Updated session ${session._id}: score=${score}, percentage=${percentage.toFixed(2)}%`);
        updated++;
      } else {
        // No answers submitted, score is 0
        session.score = 0;
        session.percentage = 0;
        session.passed = false;
        await session.save();
        console.log(`Updated session ${session._id}: no answers, score=0`);
        updated++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Updated: ${updated} sessions`);
    console.log(`Skipped: ${skipped} sessions`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

recalculateScores();
