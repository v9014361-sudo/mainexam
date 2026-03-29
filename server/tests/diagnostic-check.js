/**
 * System Diagnostic Check
 * Verifies all dependencies and configurations before running tests
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`),
};

function execPromise(command) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function checkEnvironment() {
  log.section('ENVIRONMENT CHECKS');
  
  // Check Node.js version
  const nodeVersion = process.version;
  log.info(`Node.js version: ${nodeVersion}`);
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion >= 14) {
    log.success('Node.js version is compatible');
  } else {
    log.error('Node.js version should be 14 or higher');
  }
  
  // Check .env file
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    log.success('.env file exists');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];
    requiredVars.forEach(varName => {
      if (envContent.includes(varName)) {
        log.success(`${varName} is configured`);
      } else {
        log.error(`${varName} is missing`);
      }
    });
  } else {
    log.error('.env file not found');
  }
}

async function checkDependencies() {
  log.section('DEPENDENCY CHECKS');
  
  const dependencies = [
    { name: 'Python', command: 'python --version' },
    { name: 'GCC (C Compiler)', command: 'gcc --version' },
    { name: 'G++ (C++ Compiler)', command: 'g++ --version' },
    { name: 'Java Compiler', command: 'javac -version' },
    { name: 'Java Runtime', command: 'java -version' },
  ];
  
  for (const dep of dependencies) {
    const result = await execPromise(dep.command);
    if (!result.error) {
      log.success(`${dep.name} is installed`);
      if (result.stdout) log.info(`  ${result.stdout.split('\n')[0]}`);
      if (result.stderr) log.info(`  ${result.stderr.split('\n')[0]}`);
    } else {
      log.error(`${dep.name} is NOT installed`);
    }
  }
}

async function checkServerConnection() {
  log.section('SERVER CONNECTION CHECKS');
  
  const axios = require('axios');
  const BASE_URL = 'http://localhost:5000';
  
  try {
    const res = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    if (res.status === 200) {
      log.success('Server is running and accessible');
      log.info(`  Status: ${res.data.status}`);
      log.info(`  Database: ${res.data.db}`);
      log.info(`  Uptime: ${Math.floor(res.data.uptime)}s`);
    } else {
      log.error(`Server returned status ${res.status}`);
    }
  } catch (error) {
    log.error('Server is NOT accessible');
    log.warn('Make sure to start the server: cd server && npm start');
  }
}

async function checkFileStructure() {
  log.section('FILE STRUCTURE CHECKS');
  
  const criticalFiles = [
    'server/server.js',
    'server/models/User.js',
    'server/models/Exam.js',
    'server/models/ExamSession.js',
    'server/routes/auth.js',
    'server/routes/exam.js',
    'server/routes/proctor.js',
    'server/routes/admin.js',
    'server/routes/compiler.js',
    'server/utils/encryption.js',
    'server/utils/compilerUtils.js',
    'server/controllers/compilerController.js',
    'server/websocket.js',
  ];
  
  const serverRoot = path.join(__dirname, '..');
  
  criticalFiles.forEach(file => {
    const filePath = path.join(serverRoot, '..', file);
    if (fs.existsSync(filePath)) {
      log.success(`${file} exists`);
    } else {
      log.error(`${file} is MISSING`);
    }
  });
}

async function checkCodeDirectory() {
  log.section('CODES DIRECTORY CHECK');
  
  const codesDir = path.join(__dirname, '..', 'codes');
  if (fs.existsSync(codesDir)) {
    log.success('Codes directory exists');
    const files = fs.readdirSync(codesDir);
    log.info(`  Contains ${files.length} files`);
  } else {
    log.warn('Codes directory does not exist (will be created automatically)');
  }
}

async function runDiagnostics() {
  log.section('🔍 SYSTEM DIAGNOSTIC CHECK');
  log.info(`Started at: ${new Date().toISOString()}`);
  
  await checkEnvironment();
  await checkDependencies();
  await checkFileStructure();
  await checkCodeDirectory();
  await checkServerConnection();
  
  log.section('✅ DIAGNOSTIC CHECK COMPLETE');
  log.info('If all checks passed, you can proceed with running tests');
  log.info('Run: node run-all-tests.js');
}

if (require.main === module) {
  runDiagnostics().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runDiagnostics };
