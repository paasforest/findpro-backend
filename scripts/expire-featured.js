/**
 * Expire Featured listings whose featuredUntil date has passed.
 * Run daily via cron: 0 1 * * * cd /root/findpro-backend && node scripts/expire-featured.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const expired = await prisma.business.findMany({
    where: {
      featured: true,
      featuredUntil: { lt: now },
    },
    select: { id: true, name: true, slug: true, featuredUntil: true },
  });

  if (expired.length === 0) {
    console.log('No featured listings to expire.');
    return;
  }

  const ids = expired.map((b) => b.id);
  await prisma.business.updateMany({
    where: { id: { in: ids } },
    data: { featured: false, featuredUntil: null },
  });

  console.log(`Expired ${expired.length} featured listing(s):`);
  expired.forEach((b) => {
    console.log(`  - ${b.name} (${b.slug}) was featured until ${b.featuredUntil?.toISOString().slice(0, 10)}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
