const CryptoJS = require('crypto-js');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_encryption_key_32_chars!';

/**
 * End-to-End Encryption Utilities
 * Uses AES-256-GCM for symmetric encryption
 */
class EncryptionService {
  
  // Generate a random encryption key
  static generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate a random IV
  static generateIV() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Encrypt data using AES-256
  static encrypt(data, key = ENCRYPTION_KEY) {
    try {
      const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonStr, key).toString();
      return encrypted;
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  // Decrypt data using AES-256
  static decrypt(encryptedData, key = ENCRYPTION_KEY) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) throw new Error('Decryption produced empty result');
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  // Hash data (one-way) for integrity verification
  static hash(data) {
    return CryptoJS.SHA256(typeof data === 'string' ? data : JSON.stringify(data)).toString();
  }

  // Generate HMAC for data integrity
  static generateHMAC(data, key = ENCRYPTION_KEY) {
    return CryptoJS.HmacSHA256(
      typeof data === 'string' ? data : JSON.stringify(data), 
      key
    ).toString();
  }

  // Verify HMAC
  static verifyHMAC(data, hmac, key = ENCRYPTION_KEY) {
    const computedHmac = this.generateHMAC(data, key);
    return computedHmac === hmac;
  }

  // Encrypt exam questions (server-side before sending to client)
  static encryptExamData(examData, sessionKey) {
    const dataStr = JSON.stringify(examData);
    const encrypted = this.encrypt(dataStr, sessionKey);
    const hmac = this.generateHMAC(encrypted, sessionKey);
    return { encrypted, hmac };
  }

  // Decrypt and verify exam answers (received from client)
  static decryptExamAnswers(encryptedAnswers, hmac, sessionKey) {
    // Verify integrity first
    if (!this.verifyHMAC(encryptedAnswers, hmac, sessionKey)) {
      throw new Error('Data integrity check failed - possible tampering detected');
    }
    return this.decrypt(encryptedAnswers, sessionKey);
  }

  // Generate a unique session encryption key for each exam session
  static generateSessionKey() {
    return crypto.randomBytes(32).toString('base64');
  }
}

module.exports = EncryptionService;
