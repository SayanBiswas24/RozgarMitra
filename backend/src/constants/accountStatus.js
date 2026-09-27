/**
 * User Account Status Definitions
 */
const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  SUSPENDED: 'SUSPENDED',
  BLOCKED: 'BLOCKED',
  DEACTIVATED: 'DEACTIVATED'
});

const ACCOUNT_STATUS_LIST = Object.values(ACCOUNT_STATUS);

module.exports = {
  ACCOUNT_STATUS,
  ACCOUNT_STATUS_LIST
};
