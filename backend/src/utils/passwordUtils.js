const security = require('./security');

module.exports = {
  hashPassword: security.hashPassword,
  comparePassword: security.comparePassword,
  validatePasswordStrength: security.validatePasswordStrength
};
