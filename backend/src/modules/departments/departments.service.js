const { prisma } = require('../../lib/prisma');
const { normalizeDepartments } = require('../../utils/departments');

async function list() {
  const rows = await prisma.user.findMany({
    where: { department: { not: null } },
    select: { department: true },
    distinct: ['department'],
  });

  const items = normalizeDepartments(rows.map((row) => row.department))
    .sort((a, b) => a.localeCompare(b));

  return { items };
}

module.exports = { list };
