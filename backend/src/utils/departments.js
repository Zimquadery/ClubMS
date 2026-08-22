function normalizeDepartments(list) {
  const seen = new Set();
  return list
    .map((department) => department.trim())
    .filter((department) => department.length > 0)
    .filter((department) => {
      const key = department.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

module.exports = { normalizeDepartments };
