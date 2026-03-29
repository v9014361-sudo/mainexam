/**
 * Security Audit Script
 * Checks for common security vulnerabilities and misconfigurations
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

function checkEnvironmentSecrets() {
  log.section('SECURITY CHECK 1: Environment Secrets');
  
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    log.error('.env file not found');
    issues++;
    return;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check for default/weak secrets
  const weakSecrets = [
    { key: 'JWT_SECRET', weak: ['your_super_secret', 'change_this', 'secret'] },
    { key: 'JWT_REFRESH_SECRET', weak: ['your_refresh_secret', 'change_this', 'secret'] },
    { key: 'ENCRYPTION_KEY', weak: ['your_32_char', 'change_this', 'encryption_key'] },
  ];
  
  weakSecrets.forEach(({ key, weak }) => {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    if (match) {
      const value = match[1].trim();
      const isWeak = weak.some(w => value.toLowerCase().includes(w));
      if (isWeak) {
        log.warn(`${key} appears to use default/weak value`);
        warnings++;
      } else if (value.length < 32) {
        log.warn(`${key} is shorter than 32 characters`);
        warnings++;
      } else {
        log.success(`${key} appears secure`);
      }
    } else {
      log.error(`${key} is not configured`);
      issues++;
    }
  });
}

function checkPasswordHashing() {
  log.section('SECURITY CHECK 2: Password Hashing');
  
  const userModelPath = path.join(__dirname, '..', 'models', 'User.js');
  if (!fs.existsSync(userModelPath)) {
    log.error('User model not found');
    issues++;
    return;
  }
  
  const content = fs.readFileSync(userModelPath, 'utf8');
  
  if (content.includes('bcrypt')) {
    log.success('bcrypt is used for password hashing');
  } else {
    log.error('bcrypt not found in User model');
    issues++;
  }
  
  if (content.includes('genSalt(12)') || content.includes('genSalt(10)')) {
    log.success('Appropriate salt rounds configured');
  } else {
    log.warn('Salt rounds may not be optimal');
    warnings++;
  }
}

function checkRateLimiting() {
  log.section('SECURITY CHECK 3: Rate Limiting');
  
  const rateLimitPath = path.join(__dirname, '..', 'middleware', 'rateLimit.js');
  if (!fs.existsSync(rateLimitPath)) {
    log.error('Rate limiting middleware not found');
    issues++;
    return;
  }
  
  log.success('Rate limiting middleware exists');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  if (serverContent.includes('apiLimiter')) {
    log.success('Rate limiting is applied to API routes');
  } else {
    log.error('Rate limiting not applied');
    issues++;
  }
}

function checkHelmetSecurity() {
  log.section('SECURITY CHECK 4: Helmet Security Headers');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  const content = fs.readFileSync(serverPath, 'utf8');
  
  const securityFeatures = [
    { name: 'Helmet', pattern: /helmet\(/ },
    { name: 'CSP', pattern: /contentSecurityPolicy/ },
    { name: 'HSTS', pattern: /hsts/ },
    { name: 'Frame Guard', pattern: /frameguard/ },
  ];
  
  securityFeatures.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      log.success(`${name} is configured`);
    } else {
      log.warn(`${name} may not be configured`);
      warnings++;
    }
  });
}

function checkCORS() {
  log.section('SECURITY CHECK 5: CORS Configuration');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  const content = fs.readFileSync(serverPath, 'utf8');
  
  if (content.includes('cors(')) {
    log.success('CORS is configured');
  } else {
    log.error('CORS not found');
    issues++;
  }
  
  if (content.includes('credentials: true')) {
    log.success('CORS credentials enabled');
  } else {
    log.warn('CORS credentials may not be enabled');
    warnings++;
  }
}

function checkInputValidation() {
  log.section('SECURITY CHECK 6: Input Validation');
  
  const routeFiles = [
    'routes/auth.js',
    'routes/exam.js',
    'routes/proctor.js',
  ];
  
  routeFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      log.error(`${file} not found`);
      issues++;
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('express-validator') || content.includes('Joi')) {
      log.success(`${file} uses input validation`);
    } else {
      log.warn(`${file} may lack input validation`);
      warnings++;
    }
  });
}

function checkSQLInjectionProtection() {
  log.section('SECURITY CHECK 7: SQL Injection Protection');
  
  log.info('Using MongoDB with Mongoose (NoSQL)');
  
  const modelFiles = fs.readdirSync(path.join(__dirname, '..', 'models'));
  
  modelFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const content = fs.readFileSync(path.join(__dirname, '..', 'models', file), 'utf8');
      if (content.includes('mongoose.Schema')) {
        log.success(`${file} uses Mongoose schemas (protected)`);
      }
    }
  });
}

function checkXSSProtection() {
  log.section('SECURITY CHECK 8: XSS Protection');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  const content = fs.readFileSync(serverPath, 'utf8');
  
  if (content.includes('helmet')) {
    log.success('Helmet provides XSS protection');
  } else {
    log.error('XSS protection may be missing');
    issues++;
  }
  
  // Check for dangerous patterns
  const routeFiles = fs.readdirSync(path.join(__dirname, '..', 'routes'));
  routeFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', 'routes', file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('eval(') || content.includes('Function(')) {
      log.error(`${file} contains dangerous eval/Function usage`);
      issues++;
    }
  });
}

function checkAuthenticationSecurity() {
  log.section('SECURITY CHECK 9: Authentication Security');
  
  const authPath = path.join(__dirname, '..', 'routes', 'auth.js');
  const content = fs.readFileSync(authPath, 'utf8');
  
  const securityFeatures = [
    { name: 'JWT tokens', pattern: /jsonwebtoken/ },
    { name: 'Password hashing', pattern: /bcrypt/ },
    { name: 'Account lockout', pattern: /lockUntil/ },
    { name: 'Login attempts tracking', pattern: /loginAttempts/ },
    { name: 'HttpOnly cookies', pattern: /httpOnly:\s*true/ },
    { name: 'Secure cookies', pattern: /secure:/ },
  ];
  
  securityFeatures.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      log.success(`${name} implemented`);
    } else {
      log.warn(`${name} may not be implemented`);
      warnings++;
    }
  });
}

function checkEncryption() {
  log.section('SECURITY CHECK 10: Encryption Implementation');
  
  const encryptionPath = path.join(__dirname, '..', 'utils', 'encryption.js');
  if (!fs.existsSync(encryptionPath)) {
    log.error('Encryption utility not found');
    issues++;
    return;
  }
  
  const content = fs.readFileSync(encryptionPath, 'utf8');
  
  const features = [
    { name: 'AES encryption', pattern: /AES/ },
    { name: 'HMAC verification', pattern: /HMAC/ },
    { name: 'Session keys', pattern: /generateSessionKey/ },
  ];
  
  features.forEach(({ name, pattern }) => {
    if (pattern.test(content)) {
      log.success(`${name} implemented`);
    } else {
      log.error(`${name} missing`);
      issues++;
    }
  });
}

async function runSecurityAudit() {
  log.section('🔒 SECURITY AUDIT');
  log.info(`Started at: ${new Date().toISOString()}`);
  
  checkEnvironmentSecrets();
  checkPasswordHashing();
  checkRateLimiting();
  checkHelmetSecurity();
  checkCORS();
  checkInputValidation();
  checkSQLInjectionProtection();
  checkXSSProtection();
  checkAuthenticationSecurity();
  checkEncryption();
  
  log.section('📊 SECURITY AUDIT SUMMARY');
  console.log(`Critical Issues: ${colors.red}${issues}${colors.reset}`);
  console.log(`Warnings: ${colors.yellow}${warnings}${colors.reset}`);
  
  if (issues === 0 && warnings === 0) {
    log.success('No security issues found!');
  } else if (issues === 0) {
    log.warn('Some warnings found - review recommended');
  } else {
    log.error('Critical security issues found - FIX IMMEDIATELY');
  }
  
  process.exit(issues > 0 ? 1 : 0);
}

if (require.main === module) {
  runSecurityAudit().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runSecurityAudit };
