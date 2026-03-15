/**
 * Check claim status + whether owner created account or requested claim.
 * Usage: node scripts/check-claim-and-user.js <slug>
 * Example: node scripts/check-claim-and-user.js smart-heating-energy-solutions
 *
 * Run on server: ssh root@178.104.4.77 "cd /root/findpro-backend && node scripts/check-claim-and-user.js smart-heating-energy-solutions"
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const UNCLAIMED_EMAIL = process.env.UNCLAIMED_EMAIL || 'unclaimed@findpro.co.za';

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node scripts/check-claim-and-user.js <slug>');
    process.exit(1);
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, email: true, name: true, createdAt: true } },
      city: true,
      claimTokens: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, createdAt: true, usedAt: true },
      },
    },
  });

  if (!business) {
    console.log('Business not found:', slug);
    process.exit(1);
  }

  const isUnclaimed = business.owner?.email === UNCLAIMED_EMAIL;
  console.log('=== Business ===');
  console.log('Name:', business.name);
  console.log('Slug:', business.slug);
  console.log('Owner:', business.owner?.name, '(' + business.owner?.email + ')');
  console.log('Is unclaimed:', isUnclaimed);

  console.log('\n=== Claim requests (emails that requested claim link) ===');
  if (business.claimTokens.length === 0) {
    console.log('None – no one has requested a claim link for this business.');
  } else {
    for (const ct of business.claimTokens) {
      console.log('-', ct.email, '| requested:', ct.createdAt.toISOString(), '| used:', ct.usedAt ? ct.usedAt.toISOString() : 'not used');
    }
  }

  const claimEmails = [...new Set(business.claimTokens.map((ct) => ct.email))];
  if (claimEmails.length > 0) {
    console.log('\n=== Did any of these emails create an account? ===');
    const users = await prisma.user.findMany({
      where: { email: { in: claimEmails } },
      select: { id: true, email: true, name: true, createdAt: true, emailVerified: true },
    });
    if (users.length === 0) {
      console.log('No – none of the claim-request emails have a FindPro account.');
    } else {
      for (const u of users) {
        console.log('- YES:', u.email, '| name:', u.name, '| registered:', u.createdAt.toISOString(), '| verified:', u.emailVerified);
      }
    }
  }

  console.log('\n=== Summary ===');
  if (isUnclaimed) {
    console.log('Business is still UNCLAIMED.');
    if (claimEmails.length === 0) {
      console.log('No claim requests on file.');
    } else {
      const hasAccount = claimEmails.length > 0 && (await prisma.user.count({ where: { email: { in: claimEmails } } })) > 0;
      if (hasAccount) {
        console.log('At least one person who requested a claim HAS created an account – they may have forgotten to complete the claim (sign in + click "Claim this business").');
      } else {
        console.log('No one who requested a claim has created an account yet.');
      }
    }
  } else {
    console.log('Business is CLAIMED by:', business.owner?.email);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
