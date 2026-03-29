/**
 * Master Test Runner
 * Runs all test suites sequentially
 */

const { spawn } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.magenta}${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}${colors.reset}\n`),
};

const testSuites = [
  { name: 'Encryption Tests', file: 'test-encryption.js' },
  { name: 'Compiler Tests', file: 'test-compiler-comprehensive.js' },
  { name: 'Integration Tests', file: 'integration-test.js' },
  { name: 'Comprehensive API Tests', file: 'comprehensive-test-suite.js' },
];

function runTest(testFile) {
  return new Promise((resolve) => {
    const testPath = path.join(__dirname, testFile);
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: __dirname,
    });
    
    child.on('close', (code) => {
      resolve(code === 0);
    });
    
    child.on('error', (error) => {
      log.error(`Failed to start test: ${error.message}`);
      resolve(false);
    });
  });
}

async function runAllTests() {
  log.section('🧪 MASTER TEST RUNNER - SECUREEXAM PLATFORM');
  log.info(`Started at: ${new Date().toISOString()}`);
  log.warn('Ensure the server is running on http://localhost:5000');
  log.warn('Ensure MongoDB is connected');
  console.log('');
  
  const results = [];
  
  for (const suite of testSuites) {
    log.section(`Running: ${suite.name}`);
    const success = await runTest(suite.file);
    results.push({ name: suite.name, success });
    
    if (success) {
      log.success(`${suite.name} - PASSED`);
    } else {
      log.error(`${suite.name} - FAILED`);
    }
    
    console.log('');
  }
  
  // Final summary
  log.section('📊 FINAL TEST SUMMARY');
  const passedCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  
  results.forEach(r => {
    const status = r.success ? `${colors.green}PASSED${colors.reset}` : `${colors.red}FAILED${colors.reset}`;
    console.log(`  ${r.name}: ${status}`);
  });
  
  console.log('');
  console.log(`Total Suites: ${testSuites.length}`);
  console.log(`Passed: ${colors.green}${passedCount}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failedCount}${colors.reset}`);
  console.log(`Success Rate: ${((passedCount / testSuites.length) * 100).toFixed(2)}%`);
  console.log(`\nCompleted at: ${new Date().toISOString()}`);
  
  process.exit(failedCount > 0 ? 1 : 0);
}

if (require.main === module) {
  runAllTests().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
