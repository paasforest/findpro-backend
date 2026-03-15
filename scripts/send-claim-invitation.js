/**
 * Send claim invitation email (admin-style). Run on server.
 * Usage: node scripts/send-claim-invitation.js <slug> <email>
 * Example: node scripts/send-claim-invitation.js smart-heating-energy-solutions lungisanisigola9@gmail.com
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const claimService = require('../src/modules/claim/claim.service');

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];
  const email = process.argv[3];
  if (!slug || !email) {
    console.error('Usage: node scripts/send-claim-invitation.js <slug> <email>');
    process.exit(1);
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!business) {
    console.error('Business not found:', slug);
    process.exit(1);
  }

  console.log('Sending claim invitation to', email, 'for', business.name, '...');
  const result = await claimService.sendClaimInvitation(business.id, email);
  console.log(result.message);
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
