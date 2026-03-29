# SecureExam Platform - Comprehensive Test Suite

## Overview
This test suite provides thorough testing of all system functionalities with multiple iterations to ensure consistency and reliability.

## Prerequisites

### 1. Server Running
```bash
cd server
npm install
npm start
```
Server should be running on `http://localhost:5000`

### 2. MongoDB Connected
Ensure MongoDB is running and accessible at the URI specified in `server/.env`

### 3. Required Environment Variables
Create `server/.env` with:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/secure_exam_db
JWT_SECRET=your_jwt_secret_key_here_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_key_here_min_32_chars
ENCRYPTION_KEY=your_encryption_key_32_characters
NODE_ENV=development
```

## Test Suites

### 1. Comprehensive API Test Suite
**File:** `comprehensive-test-suite.js`
**Coverage:**
- Health checks and server status
- User registration and authentication (admin, teacher, student)
- Exam creation and management
- Enrollment management
- Exam sessions and taking
- Proctoring features (violations, heartbeat, fullscreen)
- Exam submission and grading
- Results and analytics
- Admin functionalities
- Compiler and code execution
- Marks management and flagging
- Bulk operations
- Access control and authorization
- Encryption and security
- Deletion operations
- Validation and input sanitization
- Workflow automation
- Token refresh and session management

**Run:**
```bash
node comprehensive-test-suite.js
```

### 2. Encryption Test Suite
**File:** `test-encryption.js`
**Coverage:**
- Session key generation
- AES-256 encryption/decryption
- HMAC generation and verification
- Tampering detection
- Wrong key detection
- Answer encryption

**Run:**
```bash
node test-encryption.js
```

### 3. Compiler Test Suite
**File:** `test-compiler-comprehensive.js`
**Coverage:**
- Python code execution
- C++ code execution
- Java code execution
- C code execution
- Input/output handling
- Error handling (syntax, runtime, timeout)

**Run:**
```bash
node test-compiler-comprehensive.js
```

## Running All Tests

### Option 1: Master Test Runner
```bash
node run-all-tests.js
```
This runs all test suites sequentially and provides a comprehensive summary.

### Option 2: Individual Test Suites
Run each test suite separately for focused testing:
```bash
node test-encryption.js
node test-compiler-comprehensive.js
node comprehensive-test-suite.js
```

## Test Methodology

Each functionality is tested **at least 3 times** under different conditions:
- Different input data
- Different user roles
- Different states (enabled/disabled, published/unpublished, etc.)
- Edge cases and error conditions

## Expected Results

All tests should pass with:
- ✓ Green checkmarks for successful tests
- Detailed output for each test iteration
- Final summary with pass/fail counts
- Exit code 0 for success, 1 for failures

## Troubleshooting

### Tests Failing?
1. Verify server is running: `curl http://localhost:5000/api/health`
2. Check MongoDB connection
3. Verify environment variables are set
4. Check server logs for errors
5. Ensure no port conflicts

### Compiler Tests Failing?
1. Verify Python is installed: `python --version`
2. Verify GCC is installed: `gcc --version`
3. Verify G++ is installed: `g++ --version`
4. Verify Java is installed: `java -version` and `javac -version`

### Rate Limiting Issues?
If tests fail due to rate limiting, wait a few minutes between test runs or adjust rate limits in `server/middleware/rateLimit.js`

## Test Coverage

- **Authentication:** 15+ tests
- **Exam Management:** 20+ tests
- **Proctoring:** 15+ tests
- **Compiler:** 30+ tests
- **Encryption:** 15+ tests
- **Admin Features:** 15+ tests
- **Access Control:** 10+ tests
- **Validation:** 10+ tests

**Total:** 130+ individual test assertions

## Continuous Testing

For ongoing development, run tests after any code changes:
```bash
npm test  # Add this script to package.json
```

## Notes

- Tests create temporary users, exams, and sessions
- Data is not automatically cleaned up (useful for manual inspection)
- For clean slate, reset the database before testing
- Some tests (bulk upload, WebSocket) require manual verification
