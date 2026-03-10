const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../config/db');
const { sendEmail } = require('../../utils/sendEmail');

const SALT_ROUNDS = 12;

async function register(name, email, phone, password) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 400 });
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      role: 'business_owner',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to FindPro',
      text: `Hi ${name}, welcome to FindPro. You can now list your business.`,
    });
  } catch (e) {
    console.warn('Welcome email failed:', e.message);
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  return { user, token };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  };
}

async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return user;
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { message: 'If that email exists, we sent a reset link.' };
  }
  const resetToken = jwt.sign(
    { id: user.id, purpose: 'reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: 'FindPro – Reset your password',
    text: `Open this link to reset your password: ${resetUrl}`,
  });
  return { message: 'If that email exists, we sent a reset link.' };
}

async function resetPassword(token, newPassword) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== 'reset') {
    throw Object.assign(new Error('Invalid token'), { statusCode: 400 });
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: decoded.id },
    data: { passwordHash },
  });
  return { message: 'Password updated.' };
}

module.exports = { register, login, me, forgotPassword, resetPassword };
