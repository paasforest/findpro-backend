/**
 * Delete a business (and related data) by slug. Use for test/duplicate removal.
 * Usage: node scripts/delete-business-by-slug.js <slug>
 * Example: node scripts/delete-business-by-slug.js chris-plumbing
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node scripts/delete-business-by-slug.js <slug>');
    process.exit(1);
  }
  const slugTrim = slug.trim();
  let business = await prisma.business.findUnique({
    where: { slug: slugTrim },
    select: { id: true, name: true, slug: true },
  });
  if (!business) {
    const byName = await prisma.business.findFirst({
      where: { name: { contains: slugTrim.replace(/-/g, ' '), mode: 'insensitive' } },
      select: { id: true, name: true, slug: true },
    });
    business = byName;
  }
  if (!business) {
    console.log('No business found with slug or name matching:', slug);
    process.exit(0);
  }
  await prisma.claimToken.deleteMany({ where: { businessId: business.id } });
  await prisma.payment.deleteMany({ where: { businessId: business.id } });
  await prisma.business.delete({ where: { id: business.id } });
  console.log('Deleted business:', business.name, '(' + business.slug + ')');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
