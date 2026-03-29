/**
 * Automated Fix Script for Common Issues
 * Detects and fixes common problems in the codebase
 */

const fs = require('fs');
const path = require('path');

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

let fixesApplied = 0;

function ensureCodesDirectory() {
  log.section('FIX 1: Ensure Codes Directory Exists');
  
  const codesDir = path.join(__dirname, '..', 'codes');
  if (!fs.existsSync(codesDir)) {
    fs.mkdirSync(codesDir, { recursive: true });
    log.success('Created codes directory');
    fixesApplied++;
  } else {
    log.info('Codes directory already exists');
  }
}

function checkEnvFile() {
  log.section('FIX 2: Check Environment Configuration');
  
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    log.warn('.env file not found - creating template');
    const template = `PORT=5000
MONGODB_URI=mongodb://localhost:27017/secure_exam_db
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_2024
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this_in_production_2024
ENCRYPTION_KEY=your_32_char_encryption_key_here
NODE_ENV=development
CLIENT_URL=http://localhost:3000
SESSION_EXPIRY=3600000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
`;
    fs.writeFileSync(envPath, template);
    log.success('Created .env template - PLEASE UPDATE WITH YOUR VALUES');
    fixesApplied++;
  } else {
    log.info('.env file exists');
  }
}

function cleanupOldCodeFiles() {
  log.section('FIX 3: Cleanup Old Code Files');
  
  const codesDir = path.join(__dirname, '..', 'codes');
  if (!fs.existsSync(codesDir)) {
    log.info('No codes directory to clean');
    return;
  }
  
  const files = fs.readdirSync(codesDir);
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  let cleaned = 0;
  
  files.forEach(file => {
    if (file === 'library.json') return; // Skip library file
    
    const filePath = path.join(codesDir, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;
    
    if (age > ONE_HOUR) {
      fs.unlinkSync(filePath);
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    log.success(`Cleaned up ${cleaned} old code files`);
    fixesApplied++;
  } else {
    log.info('No old files to clean');
  }
}

function checkRequiredModels() {
  log.section('FIX 4: Verify Required Models');
  
  const models = ['User', 'Exam', 'ExamSession', 'Workflow', 'WorkflowLog'];
  const modelsDir = path.join(__dirname, '..', 'models');
  
  models.forEach(model => {
    const modelPath = path.join(modelsDir, `${model}.js`);
    if (fs.existsSync(modelPath)) {
      log.success(`${model} model exists`);
    } else {
      log.error(`${model} model is MISSING`);
    }
  });
}

function checkMiddleware() {
  log.section('FIX 5: Verify Middleware');
  
  const middleware = ['auth', 'rateLimit', 'auditMiddleware'];
  const middlewareDir = path.join(__dirname, '..', 'middleware');
  
  middleware.forEach(mw => {
    const mwPath = path.join(middlewareDir, `${mw}.js`);
    if (fs.existsSync(mwPath)) {
      log.success(`${mw} middleware exists`);
    } else {
      log.error(`${mw} middleware is MISSING`);
    }
  });
}

async function runFixes() {
  log.section('🔧 AUTOMATED FIX SCRIPT');
  log.info(`Started at: ${new Date().toISOString()}`);
  
  ensureCodesDirectory();
  checkEnvFile();
  cleanupOldCodeFiles();
  checkRequiredModels();
  checkMiddleware();
  
  log.section('📊 FIX SUMMARY');
  console.log(`Fixes Applied: ${colors.green}${fixesApplied}${colors.reset}`);
  log.info('Run diagnostic-check.js to verify system readiness');
}

if (require.main === module) {
  runFixes().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runFixes };
