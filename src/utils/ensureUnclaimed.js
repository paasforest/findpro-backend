/**
 * Ensures the "Unclaimed" system user exists. Unclaimed listings are owned by this user
 * until a real owner claims them via the claim flow.
 */
const bcrypt = require('bcrypt');
const { prisma } = require('../config/db');

const SALT_ROUNDS = 12;
const UNCLAIMED_EMAIL = process.env.UNCLAIMED_EMAIL || 'unclaimed@findpro.co.za';

async function ensureUnclaimedUser() {
  const hash = await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), SALT_ROUNDS);
  await prisma.user.upsert({
    where: { email: UNCLAIMED_EMAIL },
    update: {},
    create: {
      name: 'Unclaimed (system)',
      email: UNCLAIMED_EMAIL,
      passwordHash: hash,
      role: 'business_owner',
    },
  });
  console.log(`Unclaimed user ensured: ${UNCLAIMED_EMAIL}`);
}

function getUnclaimedEmail() {
  return UNCLAIMED_EMAIL;
}

async function getUnclaimedUserId() {
  const u = await prisma.user.findUnique({
    where: { email: UNCLAIMED_EMAIL },
    select: { id: true },
  });
  return u?.id ?? null;
}

module.exports = { ensureUnclaimedUser, getUnclaimedEmail, getUnclaimedUserId };
