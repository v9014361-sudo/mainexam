/**
 * Pre-Test Readiness Check
 * Quick check before running tests to ensure everything is ready
 */

const axios = require('axios');
const fs = require('fs');
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
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.magenta}${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}${colors.reset}\n`),
};

async function checkServerRunning() {
  log.section('CHECKING SERVER STATUS');
  
  try {
    const res = await axios.get('http://localhost:5000/api/health', { timeout: 3000 });
    if (res.status === 200 && res.data.status === 'ok') {
      log.success('Server is running');
      log.info(`  Uptime: ${Math.floor(res.data.uptime)}s`);
      log.info(`  Database: ${res.data.db}`);
      
      if (res.data.db === 'connected') {
        log.success('Database is connected');
        return true;
      } else {
        log.error('Database is NOT connected');
        log.warn('Some tests will fail without database connection');
        return false;
      }
    }
  } catch (error) {
    log.error('Server is NOT running');
    log.info('Start the server first: cd server && npm start');
    return false;
  }
}

function checkTestFiles() {
  log.section('CHECKING TEST FILES');
  
  const testFiles = [
    'test-encryption.js',
    'test-compiler-comprehensive.js',
    'integration-test.js',
    'comprehensive-test-suite.js',
    'run-all-tests.js',
  ];
  
  let allExist = true;
  testFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      log.success(`${file} exists`);
    } else {
      log.error(`${file} is MISSING`);
      allExist = false;
    }
  });
  
  return allExist;
}

function checkDependencies() {
  log.section('CHECKING DEPENDENCIES');
  
  try {
    require('axios');
    log.success('axios installed');
  } catch {
    log.error('axios NOT installed - run: npm install axios');
    return false;
  }
  
  return true;
}

async function runPreTestCheck() {
  log.section('🔍 PRE-TEST READINESS CHECK');
  log.info(`Started at: ${new Date().toISOString()}`);
  
  const testFilesOk = checkTestFiles();
  const depsOk = checkDependencies();
  const serverOk = await checkServerRunning();
  
  log.section('📊 READINESS SUMMARY');
  
  if (testFilesOk && depsOk && serverOk) {
    log.success('✅ ALL SYSTEMS READY - You can run tests now!');
    log.info('\nRun tests with: npm test');
    log.info('Or run individual suites:');
    log.info('  npm run test:encryption');
    log.info('  npm run test:integration');
    log.info('  npm run test:compiler');
    log.info('  npm run test:api');
    process.exit(0);
  } else {
    log.error('❌ SYSTEM NOT READY');
    
    if (!testFilesOk) {
      log.error('Test files are missing');
    }
    if (!depsOk) {
      log.error('Dependencies are missing - run: npm install');
    }
    if (!serverOk) {
      log.error('Server is not running or database not connected');
      log.info('\nStart server with:');
      log.info('  cd server');
      log.info('  npm start');
      log.info('\nThen run this check again');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  runPreTestCheck().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runPreTestCheck };
