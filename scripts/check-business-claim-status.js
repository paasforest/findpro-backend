/**
 * Check claim status of a business by slug.
 * Usage: node scripts/check-business-claim-status.js <slug>
 * Example: node scripts/check-business-claim-status.js smart-heating-energy-solutions
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const UNCLAIMED_EMAIL = process.env.UNCLAIMED_EMAIL || 'unclaimed@findpro.co.za';

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node scripts/check-business-claim-status.js <slug>');
    process.exit(1);
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, email: true, name: true } },
      city: true,
    },
  });

  if (!business) {
    console.log('Business not found:', slug);
    process.exit(1);
  }

  const isUnclaimed = business.owner?.email === UNCLAIMED_EMAIL;
  console.log('Business:', business.name);
  console.log('Slug:', business.slug);
  console.log('Owner:', business.owner?.name, '(' + business.owner?.email + ')');
  console.log('Is unclaimed:', isUnclaimed);
  console.log('Unclaimed email:', UNCLAIMED_EMAIL);
  if (isUnclaimed) {
    console.log('\n→ Business is still UNCLAIMED. Owner is system user.');
  } else {
    console.log('\n→ Business is CLAIMED. Owner:', business.owner?.email);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
