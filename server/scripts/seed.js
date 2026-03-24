/**
 * Database Seed Script
 * Creates sample users and exams for testing
 * 
 * Usage: node scripts/seed.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Exam = require('../models/Exam');
const ExamSession = require('../models/ExamSession');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_exam_db';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Exam.deleteMany({});
    await ExamSession.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create teacher
    const teacher = new User({
      name: 'Professor Smith',
      email: 'teacher@exam.com',
      password: 'Teacher@123',
      role: 'teacher',
      isVerified: true,
    });
    await teacher.save();
    console.log('👨‍🏫 Teacher created: teacher@exam.com / Teacher@123');

    // Create students
    const students = [];
    const studentData = [
      { name: 'Alice Johnson', email: 'alice@exam.com' },
      { name: 'Bob Williams', email: 'bob@exam.com' },
      { name: 'Charlie Brown', email: 'charlie@exam.com' },
    ];
    for (const s of studentData) {
      const student = new User({
        ...s,
        password: 'Student@123',
        role: 'student',
        isVerified: true,
      });
      await student.save();
      students.push(student);
    }
    console.log('🎓 Students created (password: Student@123):');
    studentData.forEach(s => console.log(`   - ${s.email}`));

    // Create admin
    const admin = new User({
      name: 'Admin User',
      email: 'admin@exam.com',
      password: 'Admin@1234',
      role: 'admin',
      isVerified: true,
    });
    await admin.save();
    console.log('🔑 Admin created: admin@exam.com / Admin@1234');

    // ─── EXAM 1: JavaScript Fundamentals ────────────────────
    const exam1 = new Exam({
      title: 'JavaScript Fundamentals',
      description: 'Test your knowledge of core JavaScript concepts including variables, functions, closures, and async programming.',
      createdBy: teacher._id,
      duration: 30,
      passingScore: 60,
      isPublished: true,
      settings: {
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        requireFullscreen: true,
        detectTabSwitch: true,
        detectCopyPaste: true,
        maxViolations: 5,
        encryptQuestions: true,
        autoSubmitOnViolation: true,
        preventScreenCapture: true,
        blockExternalApps: true,
        maxAttempts: 2,
      },
      questions: [
        {
          questionText: 'What is the output of typeof null in JavaScript?',
          questionType: 'mcq',
          points: 2,
          difficulty: 'medium',
          options: [
            { text: '"null"', isCorrect: false },
            { text: '"undefined"', isCorrect: false },
            { text: '"object"', isCorrect: true },
            { text: '"boolean"', isCorrect: false },
          ],
          explanation: 'typeof null returns "object" due to a legacy bug in JavaScript.',
        },
        {
          questionText: 'Which keyword declares a block-scoped variable that cannot be reassigned?',
          questionType: 'mcq',
          points: 1,
          difficulty: 'easy',
          options: [
            { text: 'var', isCorrect: false },
            { text: 'let', isCorrect: false },
            { text: 'const', isCorrect: true },
            { text: 'static', isCorrect: false },
          ],
        },
        {
          questionText: 'What does the "===" operator check?',
          questionType: 'mcq',
          points: 1,
          difficulty: 'easy',
          options: [
            { text: 'Value equality only', isCorrect: false },
            { text: 'Value and type equality', isCorrect: true },
            { text: 'Reference equality', isCorrect: false },
            { text: 'Deep equality', isCorrect: false },
          ],
        },
        {
          questionText: 'A closure is a function that has access to variables from its outer (enclosing) scope even after the outer function has returned.',
          questionType: 'true-false',
          points: 2,
          difficulty: 'medium',
          options: [
            { text: 'True', isCorrect: true },
            { text: 'False', isCorrect: false },
          ],
        },
        {
          questionText: 'What will console.log(0.1 + 0.2 === 0.3) output?',
          questionType: 'mcq',
          points: 2,
          difficulty: 'medium',
          options: [
            { text: 'true', isCorrect: false },
            { text: 'false', isCorrect: true },
            { text: 'undefined', isCorrect: false },
            { text: 'NaN', isCorrect: false },
          ],
          explanation: 'Due to floating-point precision, 0.1 + 0.2 = 0.30000000000000004',
        },
        {
          questionText: 'Which array method creates a new array with elements that pass a test function?',
          questionType: 'mcq',
          points: 1,
          difficulty: 'easy',
          options: [
            { text: 'map()', isCorrect: false },
            { text: 'filter()', isCorrect: true },
            { text: 'reduce()', isCorrect: false },
            { text: 'forEach()', isCorrect: false },
          ],
        },
        {
          questionText: 'What is the event loop responsible for in JavaScript?',
          questionType: 'mcq',
          points: 3,
          difficulty: 'hard',
          options: [
            { text: 'Compiling code to machine language', isCorrect: false },
            { text: 'Managing the call stack and executing queued callbacks', isCorrect: true },
            { text: 'Garbage collection', isCorrect: false },
            { text: 'Handling CSS rendering', isCorrect: false },
          ],
        },
        {
          questionText: 'Promise.all() resolves when ALL promises resolve, and rejects if ANY single promise rejects.',
          questionType: 'true-false',
          points: 2,
          difficulty: 'medium',
          options: [
            { text: 'True', isCorrect: true },
            { text: 'False', isCorrect: false },
          ],
        },
        {
          questionText: 'What keyword is used to handle errors in async/await?',
          questionType: 'short-answer',
          points: 2,
          difficulty: 'easy',
          correctAnswer: 'try-catch',
        },
        {
          questionText: 'What is the output of [...new Set([1, 2, 2, 3, 3, 3])]?',
          questionType: 'mcq',
          points: 2,
          difficulty: 'medium',
          options: [
            { text: '[1, 2, 2, 3, 3, 3]', isCorrect: false },
            { text: '[1, 2, 3]', isCorrect: true },
            { text: '{1, 2, 3}', isCorrect: false },
            { text: 'Error', isCorrect: false },
          ],
        },
      ],
    });
    await exam1.save();
    console.log('📝 Exam 1 created: JavaScript Fundamentals (10 questions, 30 min)');

    // ─── EXAM 2: Data Structures & Algorithms ───────────────
    const exam2 = new Exam({
      title: 'Data Structures & Algorithms',
      description: 'Comprehensive assessment covering arrays, linked lists, trees, sorting algorithms, and time complexity analysis.',
      createdBy: teacher._id,
      duration: 45,
      passingScore: 50,
      isPublished: true,
      settings: {
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        requireFullscreen: true,
        detectTabSwitch: true,
        detectCopyPaste: true,
        maxViolations: 3,
        encryptQuestions: true,
        autoSubmitOnViolation: true,
        preventScreenCapture: true,
        blockExternalApps: true,
        maxAttempts: 1,
      },
      questions: [
        {
          questionText: 'What is the time complexity of binary search on a sorted array?',
          questionType: 'mcq',
          points: 2,
          difficulty: 'easy',
          options: [
            { text: 'O(n)', isCorrect: false },
            { text: 'O(log n)', isCorrect: true },
            { text: 'O(n log n)', isCorrect: false },
            { text: 'O(1)', isCorrect: false },
          ],
        },
        {
          questionText: 'Which data structure uses LIFO (Last In, First Out) ordering?',
          questionType: 'mcq',
          points: 1,
          difficulty: 'easy',
          options: [
            { text: 'Queue', isCorrect: false },
            { text: 'Stack', isCorrect: true },
            { text: 'Linked List', isCorrect: false },
            { text: 'Hash Table', isCorrect: false },
          ],
        },
        {
          questionText: 'What is the worst-case time complexity of QuickSort?',
          questionType: 'mcq',
          points: 3,
          difficulty: 'hard',
          options: [
            { text: 'O(n log n)', isCorrect: false },
            { text: 'O(n²)', isCorrect: true },
            { text: 'O(n)', isCorrect: false },
            { text: 'O(log n)', isCorrect: false },
          ],
        },
        {
          questionText: 'A balanced Binary Search Tree has O(log n) search, insert, and delete operations.',
          questionType: 'true-false',
          points: 2,
          difficulty: 'medium',
          options: [
            { text: 'True', isCorrect: true },
            { text: 'False', isCorrect: false },
          ],
        },
        {
          questionText: 'Which sorting algorithm has the best average-case performance?',
          questionType: 'mcq',
          points: 2,
          difficulty: 'medium',
          options: [
            { text: 'Bubble Sort', isCorrect: false },
            { text: 'Insertion Sort', isCorrect: false },
            { text: 'Merge Sort', isCorrect: true },
            { text: 'Selection Sort', isCorrect: false },
          ],
        },
        {
          questionText: 'What data structure is used for BFS (Breadth-First Search) traversal of a graph?',
          questionType: 'mcq',
          points: 2,
          difficulty: 'medium',
          options: [
            { text: 'Stack', isCorrect: false },
            { text: 'Queue', isCorrect: true },
            { text: 'Heap', isCorrect: false },
            { text: 'Array', isCorrect: false },
          ],
        },
        {
          questionText: 'The amortized time complexity of appending to a dynamic array is O(1).',
          questionType: 'true-false',
          points: 3,
          difficulty: 'hard',
          options: [
            { text: 'True', isCorrect: true },
            { text: 'False', isCorrect: false },
          ],
        },
        {
          questionText: 'What is the space complexity of merge sort?',
          questionType: 'mcq',
          points: 2,
          difficulty: 'medium',
          options: [
            { text: 'O(1)', isCorrect: false },
            { text: 'O(log n)', isCorrect: false },
            { text: 'O(n)', isCorrect: true },
            { text: 'O(n²)', isCorrect: false },
          ],
        },
      ],
    });
    await exam2.save();
    console.log('📝 Exam 2 created: Data Structures & Algorithms (8 questions, 45 min)');

    // ─── EXAM 3: Python Basics (unpublished draft) ──────────
    const exam3 = new Exam({
      title: 'Python Programming Basics',
      description: 'Covers Python syntax, data types, control flow, functions, and basic OOP concepts.',
      createdBy: teacher._id,
      duration: 20,
      passingScore: 40,
      isPublished: false,
      settings: {
        shuffleQuestions: false,
        shuffleOptions: true,
        showResults: true,
        requireFullscreen: true,
        detectTabSwitch: true,
        detectCopyPaste: true,
        maxViolations: 5,
        encryptQuestions: true,
        autoSubmitOnViolation: false,
        preventScreenCapture: true,
        blockExternalApps: true,
        maxAttempts: 3,
      },
      questions: [
        {
          questionText: 'What is the output of print(type([]))?',
          questionType: 'mcq',
          points: 1,
          difficulty: 'easy',
          options: [
            { text: "<class 'array'>", isCorrect: false },
            { text: "<class 'list'>", isCorrect: true },
            { text: "<class 'tuple'>", isCorrect: false },
            { text: "<class 'dict'>", isCorrect: false },
          ],
        },
        {
          questionText: 'Python uses indentation to define code blocks.',
          questionType: 'true-false',
          points: 1,
          difficulty: 'easy',
          options: [
            { text: 'True', isCorrect: true },
            { text: 'False', isCorrect: false },
          ],
        },
        {
          questionText: 'Which keyword is used to define a function in Python?',
          questionType: 'short-answer',
          points: 1,
          difficulty: 'easy',
          correctAnswer: 'def',
        },
        {
          questionText: 'What does the "self" parameter refer to in a Python class method?',
          questionType: 'mcq',
          points: 2,
          difficulty: 'medium',
          options: [
            { text: 'The class itself', isCorrect: false },
            { text: 'The instance of the class', isCorrect: true },
            { text: 'The parent class', isCorrect: false },
            { text: 'A global variable', isCorrect: false },
          ],
        },
        {
          questionText: 'List comprehension [x**2 for x in range(5)] returns [0, 1, 4, 9, 16].',
          questionType: 'true-false',
          points: 2,
          difficulty: 'medium',
          options: [
            { text: 'True', isCorrect: true },
            { text: 'False', isCorrect: false },
          ],
        },
      ],
    });
    await exam3.save();
    console.log('📝 Exam 3 created: Python Basics (5 questions, 20 min) [DRAFT - unpublished]');

    // ─── Summary ────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ Seed completed successfully!');
    console.log('═══════════════════════════════════════════');
    console.log('\n  Login Credentials:');
    console.log('  ─────────────────');
    console.log('  Teacher:  teacher@exam.com  /  Teacher@123');
    console.log('  Student:  alice@exam.com    /  Student@123');
    console.log('  Student:  bob@exam.com      /  Student@123');
    console.log('  Student:  charlie@exam.com  /  Student@123');
    console.log('  Admin:    admin@exam.com    /  Admin@1234');
    console.log('\n  Published Exams: 2');
    console.log('  Draft Exams: 1');
    console.log('═══════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seedData();
