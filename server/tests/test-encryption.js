/**
 * Encryption System Test
 * Tests AES-256 encryption, HMAC verification, and session key generation
 */

const EncryptionService = require('../utils/encryption');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`),
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

async function testEncryptionService() {
  log.section('ENCRYPTION SERVICE TESTS');
  
  // Test 1: Session key generation (3 times)
  log.info('Test 1: Session Key Generation');
  for (let i = 1; i <= 3; i++) {
    const key = EncryptionService.generateSessionKey();
    assert(key && key.length > 0, `Session key ${i} generated`);
    assert(typeof key === 'string', `Session key ${i} is string`);
  }
  
  // Test 2: Encrypt and decrypt exam data (3 times with different data)
  log.info('Test 2: Exam Data Encryption/Decryption');
  const testDataSets = [
    [{ questionText: 'Q1', options: [{ text: 'A' }] }],
    [{ questionText: 'Q1' }, { questionText: 'Q2' }],
    [{ questionText: 'Complex question with special chars: @#$%^&*()' }],
  ];
  
  for (let i = 0; i < 3; i++) {
    const sessionKey = EncryptionService.generateSessionKey();
    const { encrypted, hmac } = EncryptionService.encryptExamData(testDataSets[i], sessionKey);
    
    assert(encrypted && encrypted.length > 0, `Data set ${i + 1} encrypted`);
    assert(hmac && hmac.length > 0, `HMAC ${i + 1} generated`);
    
    const decrypted = EncryptionService.decryptExamData(encrypted, hmac, sessionKey);
    assert(JSON.stringify(decrypted) === JSON.stringify(testDataSets[i]), `Data set ${i + 1} decrypted correctly`);
  }

  // Test 3: HMAC tampering detection (3 times)
  log.info('Test 3: HMAC Tampering Detection');
  for (let i = 1; i <= 3; i++) {
    const sessionKey = EncryptionService.generateSessionKey();
    const data = [{ questionText: `Tamper test ${i}` }];
    const { encrypted, hmac } = EncryptionService.encryptExamData(data, sessionKey);
    
    const tamperedHmac = hmac.substring(0, hmac.length - 5) + 'XXXXX';
    
    try {
      EncryptionService.decryptExamData(encrypted, tamperedHmac, sessionKey);
      assert(false, `Tamper detection ${i} failed - should have thrown`);
    } catch (error) {
      assert(error.message.includes('HMAC'), `Tamper detection ${i} working`);
    }
  }
  
  // Test 4: Wrong session key (3 times)
  log.info('Test 4: Wrong Session Key Detection');
  for (let i = 1; i <= 3; i++) {
    const correctKey = EncryptionService.generateSessionKey();
    const wrongKey = EncryptionService.generateSessionKey();
    const data = [{ questionText: `Key test ${i}` }];
    const { encrypted, hmac } = EncryptionService.encryptExamData(data, correctKey);
    
    try {
      EncryptionService.decryptExamData(encrypted, hmac, wrongKey);
      assert(false, `Wrong key detection ${i} failed - should have thrown`);
    } catch (error) {
      assert(true, `Wrong key detection ${i} working`);
    }
  }
  
  // Test 5: Encrypt answers (3 times)
  log.info('Test 5: Answer Encryption/Decryption');
  const answerSets = [
    [{ questionId: '1', selectedAnswer: 'A' }],
    [{ questionId: '1', selectedAnswer: 'A' }, { questionId: '2', selectedAnswer: 'B' }],
    [{ questionId: '1', selectedAnswer: 'Complex answer with special chars: @#$%' }],
  ];
  
  for (let i = 0; i < 3; i++) {
    const sessionKey = EncryptionService.generateSessionKey();
    const { encrypted, hmac } = EncryptionService.encryptExamAnswers(answerSets[i], sessionKey);
    
    assert(encrypted && encrypted.length > 0, `Answers ${i + 1} encrypted`);
    assert(hmac && hmac.length > 0, `Answer HMAC ${i + 1} generated`);
    
    const decrypted = EncryptionService.decryptExamAnswers(encrypted, hmac, sessionKey);
    assert(JSON.stringify(decrypted) === JSON.stringify(answerSets[i]), `Answers ${i + 1} decrypted correctly`);
  }
  
  log.section('ENCRYPTION TEST SUMMARY');
  console.log(`Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failed}${colors.reset}`);
  
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  testEncryptionService().catch(error => {
    log.error(`Fatal: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { testEncryptionService };
