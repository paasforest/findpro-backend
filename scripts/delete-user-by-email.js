/**
 * Delete a user (and their businesses, reviews) by email. Use with care.
 * Usage: node scripts/delete-user-by-email.js <email>
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/delete-user-by-email.js <email>');
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email }, include: { businesses: { select: { id: true, name: true } }, reviews: { select: { id: true } } } });
  if (!user) {
    console.log('No user found with email:', email);
    process.exit(0);
  }
  await prisma.review.deleteMany({ where: { userId: user.id } });
  const businessIds = user.businesses.map((b) => b.id);
  if (businessIds.length > 0) {
    await prisma.payment.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.claimToken.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.media.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.review.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.listing.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.businessServiceArea.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.businessService.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.businessCategory.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
  }
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Deleted user', email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
