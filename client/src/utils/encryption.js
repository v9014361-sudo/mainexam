import CryptoJS from 'crypto-js';

class ClientEncryption {
  static encrypt(data, key) {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonStr, key).toString();
  }

  static decrypt(encryptedData, key) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) throw new Error('Decryption failed');
      try { return JSON.parse(decrypted); } catch { return decrypted; }
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  static generateHMAC(data, key) {
    return CryptoJS.HmacSHA256(
      typeof data === 'string' ? data : JSON.stringify(data), key
    ).toString();
  }

  static verifyHMAC(data, hmac, key) {
    return this.generateHMAC(data, key) === hmac;
  }

  static hash(data) {
    return CryptoJS.SHA256(typeof data === 'string' ? data : JSON.stringify(data)).toString();
  }

  // Encrypt answers before sending to server
  static encryptAnswers(answers, sessionKey) {
    const encrypted = this.encrypt(answers, sessionKey);
    const hmac = this.generateHMAC(encrypted, sessionKey);
    return { encrypted, hmac };
  }

  // Decrypt exam questions received from server
  static decryptExamData(encryptedData, hmac, sessionKey) {
    if (!this.verifyHMAC(encryptedData, hmac, sessionKey)) {
      throw new Error('Data integrity check failed');
    }
    return this.decrypt(encryptedData, sessionKey);
  }
}

export default ClientEncryption;
