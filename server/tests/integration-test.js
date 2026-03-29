/**
 * End-to-End Integration Test
 * Simulates complete user workflows from registration to exam completion
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  validateStatus: () => true,
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.magenta}${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}${colors.reset}\n`),
};

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (condition) {
    passed++;
    log.success(message);
  } else {
    failed++;
    log.error(message);
  }
};

// ============================================================================
// SCENARIO 1: Complete Teacher Workflow
// ============================================================================
async function testTeacherWorkflow() {
  log.section('SCENARIO 1: Complete Teacher Workflow');
  
  const timestamp = Date.now();
  const teacherData = {
    name: 'Integration Teacher',
    email: `intteacher${timestamp}@test.com`,
    password: 'Teacher@123456',
    role: 'teacher',
  };
  
  // Step 1: Register
  log.info('Step 1: Teacher Registration');
  const registerRes = await api.post('/api/auth/register', teacherData);
  assert(registerRes.status === 201, 'Teacher registered successfully');
  
  // Step 2: Login
  log.info('Step 2: Teacher Login');
  const loginRes = await api.post('/api/auth/login', {
    email: teacherData.email,
    password: teacherData.password,
  });
  assert(loginRes.status === 200, 'Teacher logged in successfully');
  
  // Step 3: Create Exam
  log.info('Step 3: Create Exam');
  const examData = {
    title: 'Integration Test Exam',
    description: 'Full workflow test',
    expectedStudentCount: 10,
    duration: 30,
    questions: [
      {
        questionText: 'What is 5 + 5?',
        questionType: 'mcq',
        options: [
          { text: '8', isCorrect: false },
          { text: '10', isCorrect: true },
          { text: '12', isCorrect: false },
        ],
        points: 5,
        difficulty: 'easy',
      },
      {
        questionText: 'Is Node.js single-threaded?',
        questionType: 'true-false',
        options: [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ],
        points: 5,
        difficulty: 'medium',
      },
    ],
    settings: {
      shuffleQuestions: false,
      encryptQuestions: false,
      maxAttempts: 3,
      maxViolations: 5,
    },
    isPublished: false,
  };
  
  const createRes = await api.post('/api/exam/create', examData);
  assert(createRes.status === 201, 'Exam created successfully');
  const examId = createRes.data.exam._id;
  
  // Step 4: Publish Exam
  log.info('Step 4: Publish Exam');
  const publishRes = await api.patch(`/api/exam/${examId}/publish`);
  assert(publishRes.status === 200, 'Exam published successfully');
  assert(publishRes.data.exam.isPublished === true, 'Exam is now published');
  
  return { teacherData, examId };
}

// ============================================================================
// SCENARIO 2: Complete Student Workflow
// ============================================================================
async function testStudentWorkflow(examId) {
  log.section('SCENARIO 2: Complete Student Workflow');
  
  const timestamp = Date.now();
  const studentData = {
    name: 'Integration Student',
    email: `intstudent${timestamp}@test.com`,
    password: 'Student@123456',
    role: 'student',
    rollNumber: '21XX1A0599',
  };
  
  // Step 1: Register
  log.info('Step 1: Student Registration');
  const registerRes = await api.post('/api/auth/register', studentData);
  assert(registerRes.status === 201, 'Student registered successfully');
  
  // Step 2: Login
  log.info('Step 2: Student Login');
  const loginRes = await api.post('/api/auth/login', {
    email: studentData.email,
    password: studentData.password,
  });
  assert(loginRes.status === 200, 'Student logged in successfully');
  
  // Step 3: View Available Exams
  log.info('Step 3: View Available Exams');
  const availableRes = await api.get('/api/exam/available');
  assert(availableRes.status === 200, 'Available exams retrieved');
  assert(availableRes.data.exams.length > 0, 'At least one exam available');
  
  // Step 4: Start Exam
  log.info('Step 4: Start Exam Session');
  const startRes = await api.post(`/api/exam/${examId}/start`, {});
  assert(startRes.status === 200, 'Exam session started');
  assert(startRes.data.sessionId, 'Session ID received');
  const sessionId = startRes.data.sessionId;
  
  // Step 5: Send Heartbeats
  log.info('Step 5: Send Heartbeats');
  for (let i = 0; i < 3; i++) {
    const heartbeatRes = await api.post(`/api/proctor/heartbeat/${sessionId}`);
    assert(heartbeatRes.status === 200, `Heartbeat ${i + 1} sent`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Step 6: Report Violations
  log.info('Step 6: Report Violations');
  const violationRes = await api.post(`/api/proctor/violation/${sessionId}`, {
    type: 'tab_switch',
    details: 'Integration test violation',
    severity: 'low',
  });
  assert(violationRes.status === 200, 'Violation reported');
  
  // Step 7: Submit Exam
  log.info('Step 7: Submit Exam');
  const answers = startRes.data.examData.questions.map(q => ({
    questionId: q._id,
    selectedAnswer: q.options[1]._id, // Select second option (correct for both questions)
  }));
  
  const submitRes = await api.post(`/api/exam/${examId}/submit`, {
    sessionId: sessionId,
    answers: answers,
  });
  assert(submitRes.status === 200, 'Exam submitted successfully');
  assert(typeof submitRes.data.score === 'number', 'Score calculated');
  assert(typeof submitRes.data.percentage === 'number', 'Percentage calculated');
  
  // Step 8: View Results
  log.info('Step 8: View Results');
  const resultsRes = await api.get(`/api/exam/${examId}/results`);
  assert(resultsRes.status === 200, 'Results retrieved');
  assert(resultsRes.data.results.length > 0, 'Results contain data');
  
  return { studentData, sessionId };
}

// ============================================================================
// SCENARIO 3: Teacher Reviews Student Performance
// ============================================================================
async function testTeacherReviewWorkflow(teacherData, examId, sessionId) {
  log.section('SCENARIO 3: Teacher Reviews Student Performance');
  
  // Step 1: Login as Teacher
  log.info('Step 1: Teacher Login');
  await api.post('/api/auth/login', {
    email: teacherData.email,
    password: teacherData.password,
  });
  
  // Step 2: View All Results
  log.info('Step 2: View All Results');
  const resultsRes = await api.get(`/api/exam/${examId}/all-results`);
  assert(resultsRes.status === 200, 'All results retrieved');
  assert(resultsRes.data.results.length > 0, 'Results contain submissions');
  
  // Step 3: View Violations
  log.info('Step 3: View Student Violations');
  const violationsRes = await api.get(`/api/proctor/violations/${sessionId}`);
  assert(violationsRes.status === 200, 'Violations retrieved');
  assert(Array.isArray(violationsRes.data.violations), 'Violations array present');
  
  // Step 4: Update Marks
  log.info('Step 4: Update Student Marks');
  const marksRes = await api.patch(`/api/exam/${examId}/session/${sessionId}/marks`, {
    newScore: 8,
    reason: 'Partial credit for showing work',
    remarks: 'Good attempt',
  });
  assert(marksRes.status === 200, 'Marks updated successfully');
  
  // Step 5: Flag Session
  log.info('Step 5: Flag Suspicious Session');
  const flagRes = await api.patch(`/api/exam/${examId}/session/${sessionId}/flag`, {
    isFlagged: true,
  });
  assert(flagRes.status === 200, 'Session flagged successfully');
  
  // Step 6: Generate Reports
  log.info('Step 6: Generate Reports');
  const pdfRes = await api.get(`/api/exam/${examId}/report/security`, {
    responseType: 'arraybuffer',
  });
  assert(pdfRes.status === 200, 'Security PDF report generated');
  
  const csvRes = await api.get(`/api/exam/${examId}/report/performance`, {
    responseType: 'arraybuffer',
  });
  assert(csvRes.status === 200, 'Performance CSV report generated');
}

// ============================================================================
// SCENARIO 4: Admin Management Workflow
// ============================================================================
async function testAdminWorkflow() {
  log.section('SCENARIO 4: Admin Management Workflow');
  
  const timestamp = Date.now();
  const adminData = {
    name: 'Integration Admin',
    email: `intadmin${timestamp}@test.com`,
    password: 'Admin@123456',
    role: 'admin',
  };
  
  // Step 1: Register Admin
  log.info('Step 1: Admin Registration');
  const registerRes = await api.post('/api/auth/register', adminData);
  assert(registerRes.status === 201, 'Admin registered successfully');
  
  // Step 2: Login
  log.info('Step 2: Admin Login');
  await api.post('/api/auth/login', {
    email: adminData.email,
    password: adminData.password,
  });
  
  // Step 3: View Dashboard Stats
  log.info('Step 3: View Dashboard Statistics');
  const statsRes = await api.get('/api/admin/stats');
  assert(statsRes.status === 200, 'Dashboard stats retrieved');
  assert(statsRes.data.counters, 'Stats counters present');
  
  // Step 4: View Insights
  log.info('Step 4: View Analytics Insights');
  const insightsRes = await api.get('/api/admin/insights');
  assert(insightsRes.status === 200, 'Insights retrieved');
  
  // Step 5: Manage Users
  log.info('Step 5: Create New User');
  const newUserRes = await api.post('/api/admin/users', {
    name: 'Admin Created Student',
    email: `adminstudent${timestamp}@test.com`,
    password: 'Student@123',
    role: 'student',
    rollNumber: '21XX1A0888',
  });
  assert(newUserRes.status === 201, 'User created by admin');
  
  // Step 6: View All Users
  log.info('Step 6: View All Users');
  const usersRes = await api.get('/api/admin/users');
  assert(usersRes.status === 200, 'Users list retrieved');
  assert(Array.isArray(usersRes.data), 'Users array returned');
}

// ============================================================================
// SCENARIO 5: Complete Exam Lifecycle
// ============================================================================
async function testCompleteExamLifecycle() {
  log.section('SCENARIO 5: Complete Exam Lifecycle (3 Iterations)');
  
  for (let iteration = 1; iteration <= 3; iteration++) {
    log.info(`\n--- Iteration ${iteration}/3 ---`);
    
    const timestamp = Date.now() + iteration;
    
    // Create teacher
    const teacherData = {
      name: `Lifecycle Teacher ${iteration}`,
      email: `lifecycle_teacher${timestamp}@test.com`,
      password: 'Teacher@123456',
      role: 'teacher',
    };
    await api.post('/api/auth/register', teacherData);
    await api.post('/api/auth/login', {
      email: teacherData.email,
      password: teacherData.password,
    });
    
    // Create exam
    const examRes = await api.post('/api/exam/create', {
      title: `Lifecycle Exam ${iteration}`,
      description: 'Full lifecycle test',
      expectedStudentCount: 5,
      duration: 20,
      questions: [
        {
          questionText: `Question ${iteration}`,
          questionType: 'mcq',
          options: [
            { text: 'Wrong', isCorrect: false },
            { text: 'Correct', isCorrect: true },
          ],
          points: 10,
        },
      ],
      settings: { encryptQuestions: false, maxAttempts: 1 },
      isPublished: false,
    });
    assert(examRes.status === 201, `Iteration ${iteration}: Exam created`);
    const examId = examRes.data.exam._id;
    
    // Publish exam
    await api.patch(`/api/exam/${examId}/publish`);
    
    // Create student
    const studentData = {
      name: `Lifecycle Student ${iteration}`,
      email: `lifecycle_student${timestamp}@test.com`,
      password: 'Student@123456',
      role: 'student',
    };
    await api.post('/api/auth/register', studentData);
    await api.post('/api/auth/login', {
      email: studentData.email,
      password: studentData.password,
    });
    
    // Start exam
    const startRes = await api.post(`/api/exam/${examId}/start`, {});
    assert(startRes.status === 200, `Iteration ${iteration}: Exam started`);
    const sessionId = startRes.data.sessionId;
    
    // Send heartbeat
    await api.post(`/api/proctor/heartbeat/${sessionId}`);
    
    // Submit exam
    const answers = examRes.data.exam.questions.map(q => ({
      questionId: q._id,
      selectedAnswer: q.options[1]._id, // Select correct answer
    }));
    
    const submitRes = await api.post(`/api/exam/${examId}/submit`, {
      sessionId: sessionId,
      answers: answers,
    });
    assert(submitRes.status === 200, `Iteration ${iteration}: Exam submitted`);
    assert(submitRes.data.passed === true, `Iteration ${iteration}: Student passed`);
    
    // Teacher reviews
    await api.post('/api/auth/login', {
      email: teacherData.email,
      password: teacherData.password,
    });
    
    const resultsRes = await api.get(`/api/exam/${examId}/all-results`);
    assert(resultsRes.status === 200, `Iteration ${iteration}: Results retrieved`);
    assert(resultsRes.data.results.length === 1, `Iteration ${iteration}: One submission found`);
  }
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function runIntegrationTests() {
  log.section('🔄 END-TO-END INTEGRATION TESTS');
  log.info(`Testing against: ${BASE_URL}`);
  log.info(`Started at: ${new Date().toISOString()}`);
  
  try {
    // Run teacher workflow
    const { teacherData, examId } = await testTeacherWorkflow();
    
    // Run student workflow
    const { studentData, sessionId } = await testStudentWorkflow(examId);
    
    // Run teacher review workflow
    await testTeacherReviewWorkflow(teacherData, examId, sessionId);
    
    // Run admin workflow
    await testAdminWorkflow();
    
    // Run complete lifecycle (3 iterations)
    await testCompleteExamLifecycle();
    
    log.section('✅ INTEGRATION TEST SUMMARY');
    console.log(`Total Passed: ${colors.green}${passed}${colors.reset}`);
    console.log(`Total Failed: ${colors.red}${failed}${colors.reset}`);
    console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
    console.log(`\nCompleted at: ${new Date().toISOString()}`);
    
    if (failed === 0) {
      log.success('ALL INTEGRATION TESTS PASSED!');
    } else {
      log.error('SOME INTEGRATION TESTS FAILED');
    }
    
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    log.error(`Integration test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runIntegrationTests();
}

module.exports = { runIntegrationTests };
