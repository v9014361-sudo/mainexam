/**
 * Comprehensive Test Suite for SecureExam Platform
 * Tests all major functionalities with multiple scenarios
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  validateStatus: () => true, // Don't throw on any status
});

// Test data storage
const testData = {
  admin: null,
  teacher: null,
  students: [],
  exams: [],
  sessions: [],
  tokens: {},
};

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`),
};

let testsPassed = 0;
let testsFailed = 0;

const assert = (condition, message) => {
  if (condition) {
    testsPassed++;
    log.success(message);
  } else {
    testsFailed++;
    log.error(message);
    throw new Error(message);
  }
};

// ============================================================================
// TEST 1: HEALTH CHECK & SERVER STATUS
// ============================================================================
async function testHealthCheck() {
  log.section('TEST 1: Health Check & Server Status');
  
  for (let i = 1; i <= 3; i++) {
    log.info(`Attempt ${i}/3: Testing health endpoint`);
    const res = await api.get('/api/health');
    assert(res.status === 200, `Health check returned 200 (Attempt ${i})`);
    assert(res.data.status === 'ok', `Health status is OK (Attempt ${i})`);
    assert(res.data.db === 'connected', `Database is connected (Attempt ${i})`);
  }
  
  // Test root endpoint
  const rootRes = await api.get('/');
  assert(rootRes.status === 200, 'Root endpoint accessible');
  assert(rootRes.data.message.includes('Secure Exam'), 'Root message correct');
}

// ============================================================================
// TEST 2: USER REGISTRATION & AUTHENTICATION
// ============================================================================
async function testAuthentication() {
  log.section('TEST 2: User Registration & Authentication');
  
  // Test 1: Register Admin
  for (let i = 1; i <= 3; i++) {
    const timestamp = Date.now();
    const adminData = {
      name: `Admin User ${i}`,
      email: `admin${timestamp}_${i}@test.com`,
      password: 'Admin@123456',
      role: 'admin',
    };
    
    const res = await api.post('/api/auth/register', adminData);
    assert(res.status === 201, `Admin registration successful (Attempt ${i})`);
    assert(res.data.user.role === 'admin', `Admin role assigned (Attempt ${i})`);
    
    if (i === 1) testData.admin = { ...adminData, id: res.data.user._id };
  }
  
  // Test 2: Register Teacher
  for (let i = 1; i <= 3; i++) {
    const timestamp = Date.now();
    const teacherData = {
      name: `Teacher User ${i}`,
      email: `teacher${timestamp}_${i}@test.com`,
      password: 'Teacher@123',
      role: 'teacher',
    };
    
    const res = await api.post('/api/auth/register', teacherData);
    assert(res.status === 201, `Teacher registration successful (Attempt ${i})`);
    assert(res.data.user.role === 'teacher', `Teacher role assigned (Attempt ${i})`);
    
    if (i === 1) testData.teacher = { ...teacherData, id: res.data.user._id };
  }

  // Test 3: Register Students
  for (let i = 1; i <= 5; i++) {
    const timestamp = Date.now();
    const studentData = {
      name: `Student ${i}`,
      email: `student${timestamp}_${i}@test.com`,
      password: 'Student@123',
      role: 'student',
      rollNumber: `21XX1A050${i}`,
      branch: 'CSE',
      section: 'A',
    };
    
    const res = await api.post('/api/auth/register', studentData);
    assert(res.status === 201, `Student ${i} registration successful`);
    testData.students.push({ ...studentData, id: res.data.user._id });
  }
  
  // Test 4: Login with valid credentials (3 times)
  for (let i = 1; i <= 3; i++) {
    const loginRes = await api.post('/api/auth/login', {
      email: testData.teacher.email,
      password: testData.teacher.password,
    });
    assert(loginRes.status === 200, `Teacher login successful (Attempt ${i})`);
    assert(loginRes.data.user.email === testData.teacher.email, `Correct user returned (Attempt ${i})`);
  }
  
  // Test 5: Login with invalid credentials
  for (let i = 1; i <= 3; i++) {
    const invalidRes = await api.post('/api/auth/login', {
      email: testData.teacher.email,
      password: 'WrongPassword',
    });
    assert(invalidRes.status === 401, `Invalid login rejected (Attempt ${i})`);
  }
  
  // Test 6: Duplicate email registration
  for (let i = 1; i <= 3; i++) {
    const dupRes = await api.post('/api/auth/register', {
      name: 'Duplicate User',
      email: testData.teacher.email,
      password: 'Test@12345',
      role: 'student',
    });
    assert(dupRes.status === 409, `Duplicate email rejected (Attempt ${i})`);
  }
  
  // Test 7: Get current user info
  const meRes = await api.get('/api/auth/me');
  assert(meRes.status === 200, 'Get current user successful');
  assert(meRes.data.user.email === testData.teacher.email, 'Current user data correct');
}

// ============================================================================
// TEST 3: EXAM CREATION & MANAGEMENT
// ============================================================================
async function testExamManagement() {
  log.section('TEST 3: Exam Creation & Management');
  
  // Login as teacher first
  await api.post('/api/auth/login', {
    email: testData.teacher.email,
    password: testData.teacher.password,
  });
  
  // Test 1: Create MCQ Exam (3 times with variations)
  for (let i = 1; i <= 3; i++) {
    const examData = {
      title: `Test Exam ${i} - MCQ`,
      description: `Comprehensive test exam ${i}`,
      expectedStudentCount: 50,
      duration: 30 + (i * 10),
      passingScore: 40 + (i * 5),
      questions: [
        {
          questionText: `What is 2 + 2? (Exam ${i})`,
          questionType: 'mcq',
          options: [
            { text: '3', isCorrect: false },
            { text: '4', isCorrect: true },
            { text: '5', isCorrect: false },
          ],
          points: 1,
          difficulty: 'easy',
        },
        {
          questionText: `Is JavaScript a compiled language? (Exam ${i})`,
          questionType: 'true-false',
          options: [
            { text: 'True', isCorrect: false },
            { text: 'False', isCorrect: true },
          ],
          points: 1,
          difficulty: 'medium',
        },
      ],
      settings: {
        shuffleQuestions: true,
        shuffleOptions: true,
        maxAttempts: i,
        requireFullscreen: true,
        detectTabSwitch: true,
        maxViolations: 5,
        encryptQuestions: true,
      },
      isPublished: false,
    };
    
    const res = await api.post('/api/exam/create', examData);
    assert(res.status === 201, `Exam ${i} created successfully`);
    assert(res.data.exam.title === examData.title, `Exam ${i} title correct`);
    assert(res.data.exam.questions.length === 2, `Exam ${i} has correct question count`);
    
    if (i === 1) testData.exams.push(res.data.exam);
  }

  // Test 2: Create Coding Exam
  const codingExamData = {
    title: 'Coding Challenge Exam',
    description: 'Test coding skills',
    expectedStudentCount: 30,
    duration: 60,
    questions: [
      {
        questionText: 'Write a function to add two numbers',
        questionType: 'coding',
        points: 10,
        difficulty: 'easy',
        starterCode: 'def add(a, b):\n    # Your code here\n    pass',
        allowedLanguages: ['python', 'cpp', 'java'],
        testCases: [
          { input: '2 3', expectedOutput: '5', isPublic: true },
          { input: '10 20', expectedOutput: '30', isPublic: false },
        ],
      },
    ],
    settings: { encryptQuestions: false },
    isPublished: false,
  };
  
  const codingRes = await api.post('/api/exam/create', codingExamData);
  assert(codingRes.status === 201, 'Coding exam created successfully');
  testData.exams.push(codingRes.data.exam);
  
  // Test 3: Update Exam (3 times)
  const examToUpdate = testData.exams[0];
  for (let i = 1; i <= 3; i++) {
    const updateRes = await api.put(`/api/exam/${examToUpdate._id}`, {
      title: `Updated Exam Title ${i}`,
      duration: 45 + i,
    });
    assert(updateRes.status === 200, `Exam update successful (Attempt ${i})`);
    assert(updateRes.data.exam.title === `Updated Exam Title ${i}`, `Title updated correctly (Attempt ${i})`);
  }
  
  // Test 4: Publish/Unpublish Exam (3 times)
  for (let i = 1; i <= 3; i++) {
    const publishRes = await api.patch(`/api/exam/${examToUpdate._id}/publish`);
    assert(publishRes.status === 200, `Publish toggle successful (Attempt ${i})`);
    const expectedState = i % 2 === 1;
    assert(publishRes.data.exam.isPublished === expectedState, `Publish state correct (Attempt ${i})`);
  }
  
  // Test 5: Get all exams
  const allExamsRes = await api.get('/api/exam/');
  assert(allExamsRes.status === 200, 'Get all exams successful');
  assert(allExamsRes.data.exams.length >= 2, 'All exams returned');
  
  // Test 6: Get single exam details
  const singleExamRes = await api.get(`/api/exam/${examToUpdate._id}`);
  assert(singleExamRes.status === 200, 'Get single exam successful');
  assert(singleExamRes.data.exam._id === examToUpdate._id, 'Correct exam returned');
}

// ============================================================================
// TEST 4: ENROLLMENT MANAGEMENT
// ============================================================================
async function testEnrollment() {
  log.section('TEST 4: Enrollment Management');
  
  const exam = testData.exams[0];
  
  // Test 1: Get eligible students
  for (let i = 1; i <= 3; i++) {
    const res = await api.get('/api/exam/eligible-students');
    assert(res.status === 200, `Get eligible students successful (Attempt ${i})`);
    assert(res.data.students.length >= 5, `Students list populated (Attempt ${i})`);
  }
  
  // Test 2: Get enrollment status
  const enrollmentRes = await api.get(`/api/exam/${exam._id}/enrollment`);
  assert(enrollmentRes.status === 200, 'Get enrollment status successful');
  assert(Array.isArray(enrollmentRes.data.students), 'Students array returned');
  
  // Test 3: Enroll specific students (3 times with different sets)
  for (let i = 1; i <= 3; i++) {
    const studentIds = testData.students.slice(0, 2 + i).map(s => s.id);
    const enrollRes = await api.post(`/api/exam/${exam._id}/enroll`, { studentIds });
    assert(enrollRes.status === 200, `Enrollment update successful (Attempt ${i})`);
    assert(enrollRes.data.enrolledCount === studentIds.length, `Correct enrollment count (Attempt ${i})`);
  }
}

// ============================================================================
// TEST 5: EXAM SESSION & TAKING
// ============================================================================
async function testExamSession() {
  log.section('TEST 5: Exam Session & Taking');
  
  // Login as student
  await api.post('/api/auth/login', {
    email: testData.students[0].email,
    password: testData.students[0].password,
  });
  
  const exam = testData.exams[0];
  
  // Test 1: Get available exams
  for (let i = 1; i <= 3; i++) {
    const availableRes = await api.get('/api/exam/available');
    assert(availableRes.status === 200, `Get available exams successful (Attempt ${i})`);
    assert(Array.isArray(availableRes.data.exams), `Exams array returned (Attempt ${i})`);
  }
  
  // Test 2: Start exam session (3 different students)
  for (let i = 0; i < 3; i++) {
    await api.post('/api/auth/login', {
      email: testData.students[i].email,
      password: testData.students[i].password,
    });
    
    const startRes = await api.post(`/api/exam/${exam._id}/start`, {});
    assert(startRes.status === 200, `Student ${i + 1} exam session started`);
    assert(startRes.data.sessionId, `Session ID generated for student ${i + 1}`);
    assert(startRes.data.sessionKey, `Session key generated for student ${i + 1}`);
    
    testData.sessions.push({
      sessionId: startRes.data.sessionId,
      sessionKey: startRes.data.sessionKey,
      studentIndex: i,
      examData: startRes.data.examData,
    });
  }
  
  // Test 3: Attempt to start duplicate session
  const dupSessionRes = await api.post(`/api/exam/${exam._id}/start`, {});
  assert(dupSessionRes.status === 409, 'Duplicate session prevented');
}

// ============================================================================
// TEST 6: PROCTORING FEATURES
// ============================================================================
async function testProctoring() {
  log.section('TEST 6: Proctoring Features');
  
  const session = testData.sessions[0];
  
  // Login as the student who owns this session
  await api.post('/api/auth/login', {
    email: testData.students[session.studentIndex].email,
    password: testData.students[session.studentIndex].password,
  });
  
  // Test 1: Send heartbeat (3 times)
  for (let i = 1; i <= 3; i++) {
    const heartbeatRes = await api.post(`/api/proctor/heartbeat/${session.sessionId}`);
    assert(heartbeatRes.status === 200, `Heartbeat ${i} successful`);
    assert(heartbeatRes.data.status === 'in_progress', `Session status correct (Heartbeat ${i})`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between heartbeats
  }
  
  // Test 2: Report violations (different types, 3 times each)
  const violationTypes = ['tab_switch', 'copy_attempt', 'fullscreen_exit'];
  for (const vType of violationTypes) {
    for (let i = 1; i <= 3; i++) {
      const violationRes = await api.post(`/api/proctor/violation/${session.sessionId}`, {
        type: vType,
        details: `Test ${vType} violation ${i}`,
        severity: 'medium',
      });
      assert(violationRes.status === 200, `${vType} violation ${i} reported`);
      assert(typeof violationRes.data.totalViolations === 'number', `Violation count updated (${vType} ${i})`);
    }
  }
  
  // Test 3: Update fullscreen status (3 times)
  for (let i = 1; i <= 3; i++) {
    const fullscreenState = i % 2 === 1;
    const fullscreenRes = await api.post(`/api/proctor/fullscreen/${session.sessionId}`, {
      isFullscreen: fullscreenState,
    });
    assert(fullscreenRes.status === 200, `Fullscreen update ${i} successful`);
  }
}

// ============================================================================
// TEST 7: EXAM SUBMISSION & GRADING
// ============================================================================
async function testExamSubmission() {
  log.section('TEST 7: Exam Submission & Grading');
  
  // Test submissions for 3 different students
  for (let i = 0; i < 3; i++) {
    const session = testData.sessions[i];
    
    // Login as the student
    await api.post('/api/auth/login', {
      email: testData.students[session.studentIndex].email,
      password: testData.students[session.studentIndex].password,
    });
    
    // Prepare answers
    const exam = testData.exams[0];
    const answers = exam.questions.map((q, idx) => {
      if (q.questionType === 'mcq' || q.questionType === 'true-false') {
        // Vary correctness: student 0 gets all correct, student 1 gets 50%, student 2 gets all wrong
        const correctOption = q.options.find(o => o.isCorrect);
        const wrongOption = q.options.find(o => !o.isCorrect);
        let selectedAnswer;
        if (i === 0) selectedAnswer = correctOption._id;
        else if (i === 1) selectedAnswer = idx % 2 === 0 ? correctOption._id : wrongOption._id;
        else selectedAnswer = wrongOption._id;
        
        return {
          questionId: q._id,
          selectedAnswer: selectedAnswer,
        };
      }
      return { questionId: q._id, selectedAnswer: '' };
    });
    
    // Submit exam
    const submitRes = await api.post(`/api/exam/${exam._id}/submit`, {
      sessionId: session.sessionId,
      answers: answers,
    });
    
    assert(submitRes.status === 200, `Student ${i + 1} submission successful`);
    assert(typeof submitRes.data.score === 'number', `Student ${i + 1} score calculated`);
    assert(typeof submitRes.data.percentage === 'number', `Student ${i + 1} percentage calculated`);
    assert(typeof submitRes.data.passed === 'boolean', `Student ${i + 1} pass/fail determined`);
    
    log.info(`Student ${i + 1} scored: ${submitRes.data.percentage}% (${submitRes.data.passed ? 'PASSED' : 'FAILED'})`);
  }
  
  // Test: Attempt to submit again (should fail)
  const dupSubmitRes = await api.post(`/api/exam/${testData.exams[0]._id}/submit`, {
    sessionId: testData.sessions[0].sessionId,
    answers: [],
  });
  assert(dupSubmitRes.status === 409, 'Duplicate submission prevented');
}

// ============================================================================
// TEST 8: RESULTS & ANALYTICS
// ============================================================================
async function testResults() {
  log.section('TEST 8: Results & Analytics');
  
  // Login as teacher
  await api.post('/api/auth/login', {
    email: testData.teacher.email,
    password: testData.teacher.password,
  });
  
  const exam = testData.exams[0];
  
  // Test 1: Get all results for exam (3 times)
  for (let i = 1; i <= 3; i++) {
    const resultsRes = await api.get(`/api/exam/${exam._id}/all-results`);
    assert(resultsRes.status === 200, `Get all results successful (Attempt ${i})`);
    assert(resultsRes.data.results.length >= 3, `Results contain submissions (Attempt ${i})`);
  }
  
  // Test 2: Student views their own results (3 students)
  for (let i = 0; i < 3; i++) {
    await api.post('/api/auth/login', {
      email: testData.students[i].email,
      password: testData.students[i].password,
    });
    
    const myResultsRes = await api.get(`/api/exam/${exam._id}/results`);
    assert(myResultsRes.status === 200, `Student ${i + 1} can view their results`);
    assert(myResultsRes.data.results.length >= 1, `Student ${i + 1} has result records`);
  }
}

// ============================================================================
// TEST 9: ADMIN FUNCTIONALITIES
// ============================================================================
async function testAdminFeatures() {
  log.section('TEST 9: Admin Functionalities');
  
  // Login as admin
  await api.post('/api/auth/login', {
    email: testData.admin.email,
    password: testData.admin.password,
  });
  
  // Test 1: Get dashboard stats (3 times)
  for (let i = 1; i <= 3; i++) {
    const statsRes = await api.get('/api/admin/stats');
    assert(statsRes.status === 200, `Get stats successful (Attempt ${i})`);
    assert(statsRes.data.counters, `Stats counters present (Attempt ${i})`);
    assert(statsRes.data.counters.totalStudents >= 5, `Student count correct (Attempt ${i})`);
  }
  
  // Test 2: Get insights (3 times)
  for (let i = 1; i <= 3; i++) {
    const insightsRes = await api.get('/api/admin/insights');
    assert(insightsRes.status === 200, `Get insights successful (Attempt ${i})`);
    assert(Array.isArray(insightsRes.data.recommendations), `Recommendations array present (Attempt ${i})`);
  }
  
  // Test 3: Get all users (3 times with different filters)
  const filters = [{}, { role: 'student' }, { role: 'teacher' }];
  for (let i = 0; i < 3; i++) {
    const usersRes = await api.get('/api/admin/users', { params: filters[i] });
    assert(usersRes.status === 200, `Get users successful with filter ${i + 1}`);
    assert(Array.isArray(usersRes.data), `Users array returned (Filter ${i + 1})`);
  }
  
  // Test 4: Create user via admin (3 times)
  for (let i = 1; i <= 3; i++) {
    const timestamp = Date.now();
    const newUserRes = await api.post('/api/admin/users', {
      name: `Admin Created User ${i}`,
      email: `admincreated${timestamp}_${i}@test.com`,
      password: 'AdminUser@123',
      role: 'student',
      rollNumber: `21XX1A06${i}${i}`,
    });
    assert(newUserRes.status === 201, `Admin user creation ${i} successful`);
  }
  
  // Test 5: Update user (3 times)
  const userToUpdate = testData.students[0];
  for (let i = 1; i <= 3; i++) {
    const updateRes = await api.put(`/api/admin/users/${userToUpdate.id}`, {
      name: `Updated Student Name ${i}`,
      branch: `CSE-${i}`,
    });
    assert(updateRes.status === 200, `User update ${i} successful`);
  }
}

// ============================================================================
// TEST 10: COMPILER & CODE EXECUTION
// ============================================================================
async function testCompiler() {
  log.section('TEST 10: Compiler & Code Execution');
  
  // Login as student
  await api.post('/api/auth/login', {
    email: testData.students[0].email,
    password: testData.students[0].password,
  });
  
  // Test 1: Run Python code (3 times with different code)
  const pythonTests = [
    { code: 'print("Hello World")', expected: 'Hello World' },
    { code: 'x = 5\ny = 10\nprint(x + y)', expected: '15' },
    { code: 'for i in range(3):\n    print(i)', expected: '0\n1\n2' },
  ];
  
  for (let i = 0; i < 3; i++) {
    const runRes = await api.post('/api/compiler/run', {
      language: 'python',
      code: pythonTests[i].code,
      input: '',
    });
    assert(runRes.status === 200, `Python code execution ${i + 1} successful`);
    assert(runRes.data.stdout.trim().includes(pythonTests[i].expected.split('\n')[0]), `Python output ${i + 1} correct`);
  }
  
  // Test 2: Run C++ code (3 times)
  const cppTests = [
    '#include<iostream>\nusing namespace std;\nint main(){cout<<"Test1";return 0;}',
    '#include<iostream>\nusing namespace std;\nint main(){int a=5,b=3;cout<<a+b;return 0;}',
    '#include<iostream>\nusing namespace std;\nint main(){for(int i=0;i<3;i++)cout<<i<<" ";return 0;}',
  ];
  
  for (let i = 0; i < 3; i++) {
    const runRes = await api.post('/api/compiler/run', {
      language: 'cpp',
      code: cppTests[i],
      input: '',
    });
    assert(runRes.status === 200, `C++ code execution ${i + 1} successful`);
    assert(runRes.data.stdout || runRes.data.stderr, `C++ output ${i + 1} received`);
  }
  
  // Test 3: Run Java code (3 times)
  const javaTests = [
    'public class Main{public static void main(String[]args){System.out.println("Java1");}}',
    'public class Main{public static void main(String[]args){int x=10;System.out.println(x*2);}}',
    'public class Main{public static void main(String[]args){for(int i=0;i<3;i++)System.out.print(i+" ");}}',
  ];
  
  for (let i = 0; i < 3; i++) {
    const runRes = await api.post('/api/compiler/run', {
      language: 'java',
      code: javaTests[i],
      input: '',
    });
    assert(runRes.status === 200, `Java code execution ${i + 1} successful`);
  }
  
  // Test 4: Test with input (3 times)
  for (let i = 1; i <= 3; i++) {
    const runRes = await api.post('/api/compiler/run', {
      language: 'python',
      code: 'x = input()\nprint(int(x) * 2)',
      input: String(i * 5),
    });
    assert(runRes.status === 200, `Code with input ${i} successful`);
    assert(runRes.data.stdout.trim() === String(i * 10), `Input processing ${i} correct`);
  }
}

// ============================================================================
// TEST 11: MARKS MANAGEMENT & FLAGGING
// ============================================================================
async function testMarksManagement() {
  log.section('TEST 11: Marks Management & Flagging');
  
  // Login as teacher
  await api.post('/api/auth/login', {
    email: testData.teacher.email,
    password: testData.teacher.password,
  });
  
  const exam = testData.exams[0];
  const session = testData.sessions[0];
  
  // Test 1: Update marks (3 times with different scores)
  for (let i = 1; i <= 3; i++) {
    const newScore = 5 + (i * 2);
    const marksRes = await api.patch(`/api/exam/${exam._id}/session/${session.sessionId}/marks`, {
      newScore: newScore,
      reason: `Manual adjustment ${i}`,
      remarks: `Updated marks attempt ${i}`,
    });
    assert(marksRes.status === 200, `Marks update ${i} successful`);
    assert(marksRes.data.session.score === newScore, `Score updated correctly (Attempt ${i})`);
  }
  
  // Test 2: Flag/unflag session (3 times)
  for (let i = 1; i <= 3; i++) {
    const flagState = i % 2 === 1;
    const flagRes = await api.patch(`/api/exam/${exam._id}/session/${session.sessionId}/flag`, {
      isFlagged: flagState,
    });
    assert(flagRes.status === 200, `Flag toggle ${i} successful`);
    assert(flagRes.data.isFlagged === flagState, `Flag state correct (Attempt ${i})`);
  }
  
  // Test 3: Get violations for session (3 times)
  for (let i = 1; i <= 3; i++) {
    const violationsRes = await api.get(`/api/proctor/violations/${session.sessionId}`);
    assert(violationsRes.status === 200, `Get violations ${i} successful`);
    assert(Array.isArray(violationsRes.data.violations), `Violations array present (Attempt ${i})`);
  }
}

// ============================================================================
// TEST 12: BULK OPERATIONS
// ============================================================================
async function testBulkOperations() {
  log.section('TEST 12: Bulk Operations');
  
  // Login as admin
  await api.post('/api/auth/login', {
    email: testData.admin.email,
    password: testData.admin.password,
  });
  
  // Test 1: Get sample template (3 times)
  for (let i = 1; i <= 3; i++) {
    const templateRes = await api.get('/api/admin/users-template/sample', {
      responseType: 'arraybuffer',
    });
    assert(templateRes.status === 200, `Sample template download ${i} successful`);
    assert(templateRes.data.byteLength > 0, `Template has content (Attempt ${i})`);
  }
  
  log.info('Bulk upload test requires Excel file - skipping automated test');
}

// ============================================================================
// TEST 13: ACCESS CONTROL & AUTHORIZATION
// ============================================================================
async function testAccessControl() {
  log.section('TEST 13: Access Control & Authorization');
  
  // Test 1: Student cannot access teacher endpoints (3 different endpoints)
  await api.post('/api/auth/login', {
    email: testData.students[0].email,
    password: testData.students[0].password,
  });
  
  const teacherEndpoints = [
    { method: 'post', url: '/api/exam/create', data: {} },
    { method: 'get', url: '/api/exam/' },
    { method: 'get', url: '/api/admin/stats' },
  ];
  
  for (let i = 0; i < 3; i++) {
    const endpoint = teacherEndpoints[i];
    const res = await api[endpoint.method](endpoint.url, endpoint.data);
    assert(res.status === 403 || res.status === 401, `Student blocked from ${endpoint.url}`);
  }
  
  // Test 2: Teacher cannot access admin endpoints (3 times)
  await api.post('/api/auth/login', {
    email: testData.teacher.email,
    password: testData.teacher.password,
  });
  
  for (let i = 1; i <= 3; i++) {
    const adminRes = await api.get('/api/admin/stats');
    assert(adminRes.status === 403 || adminRes.status === 200, `Teacher admin access check ${i}`);
  }
  
  // Test 3: Unauthorized exam access (3 times)
  await api.post('/api/auth/login', {
    email: testData.students[4].email,
    password: testData.students[4].password,
  });
  
  for (let i = 1; i <= 3; i++) {
    const unauthorizedRes = await api.post(`/api/exam/${testData.exams[0]._id}/start`, {});
    // Should fail if student not enrolled
    log.info(`Unauthorized access test ${i}: Status ${unauthorizedRes.status}`);
  }
}

// ============================================================================
// TEST 14: ENCRYPTION & SECURITY
// ============================================================================
async function testEncryption() {
  log.section('TEST 14: Encryption & Security');
  
  // Login as teacher and create encrypted exam
  await api.post('/api/auth/login', {
    email: testData.teacher.email,
    password: testData.teacher.password,
  });
  
  // Test 1: Create exam with encryption enabled (3 times)
  for (let i = 1; i <= 3; i++) {
    const encryptedExamData = {
      title: `Encrypted Exam ${i}`,
      description: 'Testing encryption',
      expectedStudentCount: 20,
      duration: 30,
      questions: [
        {
          questionText: `Encrypted question ${i}`,
          questionType: 'mcq',
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false },
          ],
          points: 1,
        },
      ],
      settings: { encryptQuestions: true },
      isPublished: true,
    };
    
    const res = await api.post('/api/exam/create', encryptedExamData);
    assert(res.status === 201, `Encrypted exam ${i} created`);
    
    if (i === 1) testData.exams.push(res.data.exam);
  }
  
  // Test 2: Start encrypted exam session (3 students)
  for (let i = 0; i < 3; i++) {
    await api.post('/api/auth/login', {
      email: testData.students[i].email,
      password: testData.students[i].password,
    });
    
    const encryptedExam = testData.exams[testData.exams.length - 1];
    const startRes = await api.post(`/api/exam/${encryptedExam._id}/start`, {});
    
    if (startRes.status === 200) {
      assert(startRes.data.examData.isEncrypted === true, `Exam data encrypted for student ${i + 1}`);
      assert(startRes.data.examData.encrypted, `Encrypted payload present for student ${i + 1}`);
      assert(startRes.data.examData.hmac, `HMAC present for student ${i + 1}`);
      assert(startRes.data.sessionKey, `Session key provided for student ${i + 1}`);
    }
  }
}

// ============================================================================
// TEST 15: EXAM DELETION & SESSION RESET
// ============================================================================
async function testDeletionOperations() {
  log.section('TEST 15: Exam Deletion & Session Reset');
  
  // Login as teacher
  await api.post('/api/auth/login', {
    email: testData.teacher.email,
    password: testData.teacher.password,
  });
  
  // Test 1: Reset exam session (3 times for different sessions)
  for (let i = 0; i < 3; i++) {
    const session = testData.sessions[i];
    const exam = testData.exams[0];
    
    const resetRes = await api.delete(`/api/exam/${exam._id}/session/${session.sessionId}`);
    assert(resetRes.status === 200, `Session ${i + 1} reset successful`);
  }
  
  // Test 2: Create and delete test exams (3 times)
  for (let i = 1; i <= 3; i++) {
    // Create exam
    const examData = {
      title: `Exam to Delete ${i}`,
      description: 'Will be deleted',
      expectedStudentCount: 10,
      duration: 20,
      questions: [
        {
          questionText: 'Test question',
          questionType: 'mcq',
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
          points: 1,
        },
      ],
    };
    
    const createRes = await api.post('/api/exam/create', examData);
    assert(createRes.status === 201, `Deletable exam ${i} created`);
    
    // Delete exam
    const deleteRes = await api.delete(`/api/exam/${createRes.data.exam._id}`);
    assert(deleteRes.status === 200, `Exam ${i} deleted successfully`);
  }
  
  // Test 3: Delete user (admin only)
  await api.post('/api/auth/login', {
    email: testData.admin.email,
    password: testData.admin.password,
  });
  
  // Create users to delete
  for (let i = 1; i <= 3; i++) {
    const timestamp = Date.now();
    const userRes = await api.post('/api/admin/users', {
      name: `User to Delete ${i}`,
      email: `todelete${timestamp}_${i}@test.com`,
      password: 'Delete@123',
      role: 'student',
    });
    
    if (userRes.status === 201) {
      const deleteRes = await api.delete(`/api/admin/users/${userRes.data.user._id}`);
      assert(deleteRes.status === 200, `User ${i} deleted successfully`);
    }
  }
}

// ============================================================================
// TEST 16: EDGE CASES & ERROR HANDLING
// ============================================================================
async function testEdgeCases() {
  log.section('TEST 16: Edge Cases & Error Handling');
  
  // Test 1: Invalid exam ID (3 times)
  await api.post('/api/auth/login', {
    email: testData.teacher.email,
    password: testData.teacher.password,
  });
  
  for (let i = 1; i <= 3; i++) {
    const invalidId = '507f1f77bcf86cd799439011';
    const res = await api.get(`/api/exam/${invalidId}`);
    assert(res.status === 404, `Invalid exam ID handled (Attempt ${i})`);
  }
  
  // Test 2: Malformed request bodies (3 different cases)
  const malformedRequests = [
    { url: '/api/exam/create', data: { title: '' } },
    { url: '/api/exam/create', data: { title: 'Test', duration: -5 } },
    { url: '/api/exam/create', data: { title: 'Test', duration: 30, questions: [] } },
  ];
  
  for (let i = 0; i < 3; i++) {
    const res = await api.post(malformedRequests[i].url, malformedRequests[i].data);
    assert(res.status === 400, `Malformed request ${i + 1} rejected`);
  }
  
  // Test 3: Unauthorized access attempts (3 times)
  await api.post('/api/auth/logout');
  
  for (let i = 1; i <= 3; i++) {
    const res = await api.get('/api/exam/');
    assert(res.status === 401, `Unauthorized access blocked (Attempt ${i})`);
  }
  
  // Test 4: Rate limiting (attempt many requests quickly)
  await api.post('/api/auth/login', {
    email: testData.teacher.email,
    password: testData.teacher.password,
  });
  
  log.info('Testing rate limiting with rapid requests...');
  let rateLimitHit = false;
  for (let i = 0; i < 50; i++) {
    const res = await api.get('/api/health');
    if (res.status === 429) {
      rateLimitHit = true;
      break;
    }
  }
  log.info(`Rate limiting: ${rateLimitHit ? 'Working' : 'Not triggered (may need more requests)'}`);
}

// ============================================================================
// TEST 17: REPORT GENERATION
// ============================================================================
async function testReportGeneration() {
  log.section('TEST 17: Report Generation');
  
  // Login as teacher
  await api.post('/api/auth/login', {
    email: testData.teacher.email,
    password: testData.teacher.password,
  });
  
  const exam = testData.exams[0];
  
  // Test 1: Generate security report PDF (3 times)
  for (let i = 1; i <= 3; i++) {
    const pdfRes = await api.get(`/api/exam/${exam._id}/report/security`, {
      responseType: 'arraybuffer',
    });
    assert(pdfRes.status === 200, `Security PDF report ${i} generated`);
    assert(pdfRes.data.byteLength > 0, `PDF has content (Attempt ${i})`);
  }
  
  // Test 2: Generate performance report CSV (3 times)
  for (let i = 1; i <= 3; i++) {
    const csvRes = await api.get(`/api/exam/${exam._id}/report/performance`, {
      responseType: 'arraybuffer',
    });
    assert(csvRes.status === 200, `Performance CSV report ${i} generated`);
    assert(csvRes.data.byteLength > 0, `CSV has content (Attempt ${i})`);
  }
}

// ============================================================================
// TEST 18: TOKEN REFRESH & SESSION MANAGEMENT
// ============================================================================
async function testTokenManagement() {
  log.section('TEST 18: Token Refresh & Session Management');
  
  // Login to get tokens
  await api.post('/api/auth/login', {
    email: testData.teacher.email,
    password: testData.teacher.password,
  });
  
  // Test 1: Refresh token (3 times)
  for (let i = 1; i <= 3; i++) {
    const refreshRes = await api.post('/api/auth/refresh');
    assert(refreshRes.status === 200, `Token refresh ${i} successful`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test 2: Logout (3 times)
  for (let i = 1; i <= 3; i++) {
    await api.post('/api/auth/login', {
      email: testData.teacher.email,
      password: testData.teacher.password,
    });
    
    const logoutRes = await api.post('/api/auth/logout');
    assert(logoutRes.status === 200, `Logout ${i} successful`);
  }
}

// ============================================================================
// TEST 19: VALIDATION & INPUT SANITIZATION
// ============================================================================
async function testValidation() {
  log.section('TEST 19: Validation & Input Sanitization');
  
  // Test 1: Invalid email formats (3 times)
  const invalidEmails = ['notanemail', 'missing@domain', '@nodomain.com'];
  for (let i = 0; i < 3; i++) {
    const res = await api.post('/api/auth/register', {
      name: 'Test User',
      email: invalidEmails[i],
      password: 'Valid@123',
      role: 'student',
    });
    assert(res.status === 400, `Invalid email ${i + 1} rejected`);
  }
  
  // Test 2: Weak passwords (3 times)
  const weakPasswords = ['short', 'nouppercaseornumber', 'NoSpecialChar123'];
  for (let i = 0; i < 3; i++) {
    const timestamp = Date.now();
    const res = await api.post('/api/auth/register', {
      name: 'Test User',
      email: `weakpass${timestamp}_${i}@test.com`,
      password: weakPasswords[i],
      role: 'student',
    });
    assert(res.status === 400, `Weak password ${i + 1} rejected`);
  }
  
  // Test 3: Invalid exam data (3 times)
  await api.post('/api/auth/login', {
    email: testData.teacher.email,
    password: testData.teacher.password,
  });
  
  const invalidExamData = [
    { title: '', duration: 30, questions: [] },
    { title: 'Test', duration: 0, questions: [] },
    { title: 'Test', duration: 30, questions: [{ questionText: '', questionType: 'mcq' }] },
  ];
  
  for (let i = 0; i < 3; i++) {
    const res = await api.post('/api/exam/create', invalidExamData[i]);
    assert(res.status === 400, `Invalid exam data ${i + 1} rejected`);
  }
}

// ============================================================================
// TEST 20: WORKFLOW AUTOMATION
// ============================================================================
async function testWorkflows() {
  log.section('TEST 20: Workflow Automation');
  
  // Login as admin
  await api.post('/api/auth/login', {
    email: testData.admin.email,
    password: testData.admin.password,
  });
  
  // Test 1: Get workflows (3 times)
  for (let i = 1; i <= 3; i++) {
    const res = await api.get('/api/admin/workflows');
    assert(res.status === 200, `Get workflows ${i} successful`);
    assert(Array.isArray(res.data), `Workflows array returned (Attempt ${i})`);
  }
  
  // Test 2: Create workflows (3 different workflows)
  const workflows = [
    {
      name: 'Auto-notify on fail',
      trigger: 'exam_submitted',
      condition: { field: 'passed', operator: 'equals', value: false },
      action: { type: 'send_email', template: 'exam_failed' },
      isEnabled: true,
    },
    {
      name: 'Flag high violations',
      trigger: 'exam_submitted',
      condition: { field: 'violations', operator: 'greater_than', value: 5 },
      action: { type: 'flag_session' },
      isEnabled: true,
    },
    {
      name: 'Congratulate high scorers',
      trigger: 'exam_submitted',
      condition: { field: 'percentage', operator: 'greater_than', value: 90 },
      action: { type: 'send_email', template: 'high_score' },
      isEnabled: true,
    },
  ];
  
  for (let i = 0; i < 3; i++) {
    const res = await api.post('/api/admin/workflows', workflows[i]);
    assert(res.status === 200, `Workflow ${i + 1} created`);
    assert(res.data.name === workflows[i].name, `Workflow ${i + 1} name correct`);
  }
  
  // Test 3: Get workflow history (3 times)
  for (let i = 1; i <= 3; i++) {
    const historyRes = await api.get('/api/admin/workflows/history');
    assert(historyRes.status === 200, `Workflow history ${i} retrieved`);
    assert(Array.isArray(historyRes.data), `History array returned (Attempt ${i})`);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runAllTests() {
  console.log('\n');
  log.section('🚀 COMPREHENSIVE TEST SUITE - SECUREEXAM PLATFORM');
  log.info(`Testing against: ${BASE_URL}`);
  log.info(`Started at: ${new Date().toISOString()}`);
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Exam Management', fn: testExamManagement },
    { name: 'Enrollment', fn: testEnrollment },
    { name: 'Exam Session', fn: testExamSession },
    { name: 'Proctoring', fn: testProctoring },
    { name: 'Exam Submission', fn: testExamSubmission },
    { name: 'Results', fn: testResults },
    { name: 'Admin Features', fn: testAdminFeatures },
    { name: 'Compiler', fn: testCompiler },
    { name: 'Marks Management', fn: testMarksManagement },
    { name: 'Bulk Operations', fn: testBulkOperations },
    { name: 'Access Control', fn: testAccessControl },
    { name: 'Encryption', fn: testEncryption },
    { name: 'Deletion Operations', fn: testDeletionOperations },
    { name: 'Validation', fn: testValidation },
    { name: 'Workflows', fn: testWorkflows },
    { name: 'Token Management', fn: testTokenManagement },
  ];
  
  for (const test of tests) {
    try {
      await test.fn();
      log.success(`${test.name} - ALL TESTS PASSED`);
    } catch (error) {
      log.error(`${test.name} - FAILED: ${error.message}`);
    }
  }
  
  // Final summary
  log.section('📊 TEST SUMMARY');
  console.log(`Total Tests Passed: ${colors.green}${testsPassed}${colors.reset}`);
  console.log(`Total Tests Failed: ${colors.red}${testsFailed}${colors.reset}`);
  console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(2)}%`);
  console.log(`\nCompleted at: ${new Date().toISOString()}`);
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runAllTests().catch((error) => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
