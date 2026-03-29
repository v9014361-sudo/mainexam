/**
 * Code Quality Verification
 * Checks code for common issues without running the server
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

let issues = 0;
let warnings = 0;

function checkImports() {
  log.section('CHECK 1: Import Statements');
  
  const files = [
    { path: 'routes/auth.js', required: ['User', 'ExamSession', 'Exam', 'logSecurityEvent'] },
    { path: 'routes/exam.js', required: ['Exam', 'ExamSession', 'User', 'EncryptionService', 'logSecurityEvent'] },
    { path: 'routes/proctor.js', required: ['ExamSession', 'Exam'] },
    { path: 'routes/admin.js', required: ['User', 'Exam', 'ExamSession', 'Workflow', 'WorkflowLog'] },
    { path: 'controllers/compilerController.js', required: ['Exam', 'ExamSession'] },
  ];
  
  files.forEach(({ path: filePath, required }) => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      log.error(`${filePath} not found`);
      issues++;
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    required.forEach(imp => {
      if (content.includes(imp)) {
        log.success(`${filePath}: ${imp} imported`);
      } else {
        log.error(`${filePath}: ${imp} NOT imported`);
        issues++;
      }
    });
  });
}

function checkAsyncErrorHandling() {
  log.section('CHECK 2: Async Error Handling');
  
  const routeFiles = fs.readdirSync(path.join(__dirname, '..', 'routes'));
  
  routeFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', 'routes', file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Count async functions
    const asyncCount = (content.match(/async\s*\(/g) || []).length;
    // Count try-catch blocks
    const tryCatchCount = (content.match(/try\s*{/g) || []).length;
    
    if (asyncCount > 0) {
      if (tryCatchCount >= asyncCount * 0.8) {
        log.success(`${file}: Good error handling (${tryCatchCount}/${asyncCount})`);
      } else {
        log.warn(`${file}: May need more error handling (${tryCatchCount}/${asyncCount})`);
        warnings++;
      }
    }
  });
}

function checkModelValidation() {
  log.section('CHECK 3: Model Validation');
  
  const models = ['User', 'Exam', 'ExamSession'];
  
  models.forEach(model => {
    const modelPath = path.join(__dirname, '..', 'models', `${model}.js`);
    if (!fs.existsSync(modelPath)) {
      log.error(`${model} model not found`);
      issues++;
      return;
    }
    
    const content = fs.readFileSync(modelPath, 'utf8');
    
    // Check for required fields
    if (content.includes('required:')) {
      log.success(`${model}: Has required field validation`);
    } else {
      log.warn(`${model}: May lack required field validation`);
      warnings++;
    }
    
    // Check for indexes
    if (content.includes('.index(')) {
      log.success(`${model}: Has database indexes`);
    } else {
      log.info(`${model}: No explicit indexes (may be OK)`);
    }
  });
}

function checkRouteAuthentication() {
  log.section('CHECK 4: Route Authentication');
  
  const routeFiles = ['exam.js', 'proctor.js', 'admin.js'];
  
  routeFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', 'routes', file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('authenticate')) {
      log.success(`${file}: Uses authentication middleware`);
    } else {
      log.error(`${file}: Missing authentication`);
      issues++;
    }
    
    if (content.includes('authorize')) {
      log.success(`${file}: Uses authorization middleware`);
    } else {
      log.warn(`${file}: May lack role-based authorization`);
      warnings++;
    }
  });
}

function checkEnvironmentVariables() {
  log.section('CHECK 5: Environment Variables Usage');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  const content = fs.readFileSync(serverPath, 'utf8');
  
  const envVars = ['PORT', 'MONGODB_URI', 'JWT_SECRET', 'NODE_ENV'];
  
  envVars.forEach(varName => {
    if (content.includes(`process.env.${varName}`)) {
      log.success(`${varName} is used`);
    } else {
      log.warn(`${varName} may not be used`);
      warnings++;
    }
  });
}

function checkDatabaseConnection() {
  log.section('CHECK 6: Database Connection Handling');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  const content = fs.readFileSync(serverPath, 'utf8');
  
  const checks = [
    { name: 'Connection error handling', pattern: /mongoose\.connection\.on\('error'/ },
    { name: 'Disconnection handling', pattern: /mongoose\.connection\.on\('disconnected'/ },
    { name: 'Reconnection logic', pattern: /reconnect/ },
  ];
  
  checks.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      log.success(name);
    } else {
      log.warn(`${name} may be missing`);
      warnings++;
    }
  });
}

function checkWebSocketImplementation() {
  log.section('CHECK 7: WebSocket Implementation');
  
  const wsPath = path.join(__dirname, '..', 'websocket.js');
  if (!fs.existsSync(wsPath)) {
    log.error('WebSocket file not found');
    issues++;
    return;
  }
  
  const content = fs.readFileSync(wsPath, 'utf8');
  
  const features = [
    'authentication',
    'teacher:subscribe',
    'student:register',
    'violation',
    'heartbeat',
  ];
  
  features.forEach(feature => {
    if (content.includes(feature)) {
      log.success(`WebSocket: ${feature} implemented`);
    } else {
      log.warn(`WebSocket: ${feature} may be missing`);
      warnings++;
    }
  });
}

async function runCodeQualityCheck() {
  log.section('🔍 CODE QUALITY VERIFICATION');
  log.info(`Started at: ${new Date().toISOString()}`);
  
  checkImports();
  checkAsyncErrorHandling();
  checkModelValidation();
  checkRouteAuthentication();
  checkEnvironmentVariables();
  checkDatabaseConnection();
  checkWebSocketImplementation();
  
  log.section('📊 CODE QUALITY SUMMARY');
  console.log(`Critical Issues: ${colors.red}${issues}${colors.reset}`);
  console.log(`Warnings: ${colors.yellow}${warnings}${colors.reset}`);
  
  if (issues === 0 && warnings === 0) {
    log.success('Code quality is excellent!');
  } else if (issues === 0) {
    log.info('Code quality is good with minor warnings');
  } else {
    log.error('Critical issues found - fix before deployment');
  }
  
  process.exit(issues > 0 ? 1 : 0);
}

if (require.main === module) {
  runCodeQualityCheck().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runCodeQualityCheck };
