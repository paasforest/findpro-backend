/**
 * Remove duplicate businesses (same name + city). Keeps the oldest, deletes the rest.
 * Usage: node scripts/deduplicate-businesses.js [--dry-run]
 * Use --dry-run to see what would be deleted without actually deleting.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalize(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const businesses = await prisma.business.findMany({
    include: { city: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map();
  for (const b of businesses) {
    const key = `${normalize(b.name)}|${b.cityId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }

  let deleted = 0;
  for (const [key, list] of groups) {
    if (list.length <= 1) continue;
    const [keep, ...dupes] = list;
    for (const dup of dupes) {
      if (dryRun) {
        console.log('Would delete:', dup.name, '(' + dup.slug + ') in', dup.city?.name);
      } else {
        await prisma.claimToken.deleteMany({ where: { businessId: dup.id } });
        await prisma.payment.deleteMany({ where: { businessId: dup.id } });
        await prisma.business.delete({ where: { id: dup.id } });
        console.log('Deleted duplicate:', dup.name, '(' + dup.slug + ')');
      }
      deleted++;
    }
  }
  console.log(dryRun ? `Would delete ${deleted} duplicate(s). Run without --dry-run to apply.` : `Deleted ${deleted} duplicate(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
