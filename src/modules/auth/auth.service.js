const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../config/db');
const { sendEmail } = require('../../utils/sendEmail');

const SALT_ROUNDS = 12;
const VERIFICATION_EXPIRY_HOURS = 24;

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function register(name, email, phone, password) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 400 });
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const verificationToken = generateVerificationToken();
  const verificationExpiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      role: 'business_owner',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: verificationExpiresAt,
    },
    select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true },
  });
  const frontendUrl = process.env.FRONTEND_URL || 'https://findpro.co.za';
  const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
  try {
    await sendEmail({
      to: email,
      subject: 'Verify your email – FindPro',
      text: `Hi ${name},\n\nPlease verify your email by opening this link:\n${verifyUrl}\n\nThe link expires in ${VERIFICATION_EXPIRY_HOURS} hours.\n\nIf you didn't sign up for FindPro, you can ignore this email.`,
      html: `<p>Hi ${name},</p><p>Please <a href="${verifyUrl}">verify your email</a> to complete your FindPro registration.</p><p>The link expires in ${VERIFICATION_EXPIRY_HOURS} hours.</p><p>If you didn't sign up for FindPro, you can ignore this email.</p>`,
    });
  } catch (e) {
    console.warn('Verification email failed:', e.message);
  }
  try {
    const dashboardUrl = `${frontendUrl}/dashboard`;
    const addBusinessUrl = `${frontendUrl}/add-business`;
    await sendEmail({
      to: email,
      subject: 'Welcome to FindPro – List your business',
      text: `Hi ${name},\n\nWelcome to FindPro. You're one step away from getting in front of customers.\n\n1. Verify your email using the link we just sent you.\n2. Add your business: ${addBusinessUrl}\n3. Once approved, your listing goes live. Upgrade to Featured or Premium from your dashboard to stand out.\n\nDashboard: ${dashboardUrl}\n\nQuestions? Reply to this email or visit findpro.co.za.`,
      html: `<p>Hi ${name},</p><p>Welcome to <strong>FindPro</strong>. You're one step away from getting in front of customers.</p><ol><li>Verify your email using the link we just sent you.</li><li><a href="${addBusinessUrl}">Add your business</a></li><li>Once approved, your listing goes live. Upgrade to Featured or Premium from your dashboard to stand out.</li></ol><p><a href="${dashboardUrl}">Go to your Dashboard</a></p><p>Questions? Reply to this email or visit findpro.co.za.</p>`,
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

async function verifyEmail(token) {
  if (!token) throw Object.assign(new Error('Verification token required'), { statusCode: 400 });
  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token },
    select: { id: true, name: true, email: true, emailVerificationExpiresAt: true },
  });
  if (!user) throw Object.assign(new Error('Invalid or expired verification link'), { statusCode: 400 });
  if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
    throw Object.assign(new Error('Verification link has expired. Please request a new one.'), { statusCode: 400 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerificationToken: null, emailVerificationExpiresAt: null },
  });
  try {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'https://findpro.co.za'}/dashboard`;
    await sendEmail({
      to: user.email,
      subject: 'Your email is verified – FindPro',
      text: `Hi ${user.name}, your email is verified. You're all set. Add your business or manage your dashboard: ${dashboardUrl}`,
      html: `<p>Hi ${user.name},</p><p>Your email is verified. You're all set.</p><p><a href="${dashboardUrl}">Go to your Dashboard</a> to add your business or manage your listings.</p>`,
    });
  } catch (e) {
    console.warn('Email-verified confirmation failed:', e.message);
  }
  return { message: 'Email verified. You can now use your account fully.' };
}

async function resendVerification(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerified: true },
  });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (user.emailVerified) return { message: 'Email is already verified.' };
  const verificationToken = generateVerificationToken();
  const verificationExpiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerificationToken: verificationToken, emailVerificationExpiresAt: verificationExpiresAt },
  });
  const frontendUrl = process.env.FRONTEND_URL || 'https://findpro.co.za';
  const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your email – FindPro',
    text: `Hi ${user.name}, open this link to verify your email: ${verifyUrl}. It expires in ${VERIFICATION_EXPIRY_HOURS} hours.`,
    html: `<p>Hi ${user.name},</p><p><a href="${verifyUrl}">Verify your email</a> (expires in ${VERIFICATION_EXPIRY_HOURS} hours).</p>`,
  });
  return { message: 'Verification email sent. Check your inbox.' };
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
    user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified },
    token,
  };
}

async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, role: true, emailVerified: true, createdAt: true },
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

module.exports = { register, login, me, verifyEmail, resendVerification, forgotPassword, resetPassword };
