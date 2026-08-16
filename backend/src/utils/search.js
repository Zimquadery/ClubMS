function userSearchWhere(search) {
  const q = search?.trim();
  if (!q) return null;
  return {
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ],
  };
}

module.exports = { userSearchWhere };
