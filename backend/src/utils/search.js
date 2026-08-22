function userSearchWhere(search) {
  const q = search?.trim();
  if (!q) return null;
  return {
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { studentId: { contains: q, mode: 'insensitive' } },
      { department: { contains: q, mode: 'insensitive' } },
    ],
  };
}

module.exports = { userSearchWhere };
