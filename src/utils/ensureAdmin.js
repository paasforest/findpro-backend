/**
 * Ensures an admin user exists on server startup and password matches ADMIN_PASSWORD.
 * Root cause fix: 401 on login when (1) seed was never run, or (2) admin has wrong password.
 * This bootstrap creates/updates admin on every restart so ADMIN_EMAIL + ADMIN_PASSWORD always work.
 */
const bcrypt = require('bcrypt');
const { prisma } = require('../config/db');

const SALT_ROUNDS = 12;

async function ensureAdminExists() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@findpro.co.za';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const hash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hash, role: 'admin' },
    create: {
      name: 'Admin',
      email: adminEmail,
      passwordHash: hash,
      role: 'admin',
    },
  });
  console.log(`Admin user ensured: ${adminEmail}`);
}

module.exports = { ensureAdminExists };
