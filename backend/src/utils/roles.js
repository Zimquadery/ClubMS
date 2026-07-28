function isPrivilegedRole(role) {
  return role === 'PLATFORM_ADMIN' || role === 'FACULTY';
}

module.exports = { isPrivilegedRole };
