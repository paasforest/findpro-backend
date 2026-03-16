/**
 * Remove Randburg duplicate of Smart Heating Energy Solutions.
 * Keeps Johannesburg record (smart-heating-energy-solutions), deletes Randburg (smart-heating-energy-solutions-1).
 * Usage: node scripts/fix-smart-heating-duplicate.js [--dry-run]
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const randburgSlug = 'smart-heating-energy-solutions-1';
  const johannesburgSlug = 'smart-heating-energy-solutions';

  const toDelete = await prisma.business.findUnique({
    where: { slug: randburgSlug },
    include: { city: true },
  });

  if (!toDelete) {
    console.log('Randburg duplicate not found:', randburgSlug);
    return;
  }

  const toKeep = await prisma.business.findUnique({
    where: { slug: johannesburgSlug },
    include: { city: true },
  });

  if (!toKeep) {
    console.error('Johannesburg record not found:', johannesburgSlug);
    process.exit(1);
  }

  console.log('Will DELETE (Randburg duplicate):', toDelete.name, '-', toDelete.slug, '-', toDelete.city?.name);
  console.log('Will KEEP (Johannesburg):', toKeep.name, '-', toKeep.slug, '-', toKeep.city?.name);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes made. Run without --dry-run to delete.');
    return;
  }

  await prisma.business.delete({
    where: { id: toDelete.id },
  });

  console.log('\nDeleted Randburg duplicate. Johannesburg record remains.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
