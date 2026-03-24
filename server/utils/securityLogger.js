const logSecurityEvent = (type, details = {}) => {
  const payload = {
    type,
    timestamp: new Date().toISOString(),
    ...details,
  };
  console.log('SECURITY_EVENT', JSON.stringify(payload));
};

module.exports = { logSecurityEvent };
