/**
 * Role-Based Access Control (RBAC) Role Definitions
 */
const ROLES = Object.freeze({
  USER: 'USER',
  ADMIN: 'ADMIN',
  GOVT_OFFICIAL: 'GOVT_OFFICIAL'
});

const ROLE_LIST = Object.values(ROLES);

module.exports = {
  ROLES,
  ROLE_LIST
};
