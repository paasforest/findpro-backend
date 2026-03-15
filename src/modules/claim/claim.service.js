const crypto = require('crypto');
const { prisma } = require('../../config/db');
const { sendEmail } = require('../../utils/sendEmail');
const { getUnclaimedUserId } = require('../../utils/ensureUnclaimed');

const CLAIM_EXPIRY_DAYS = 7;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

async function requestClaim(businessId, email) {
  const unclaimedId = await getUnclaimedUserId();
  if (!unclaimedId) throw Object.assign(new Error('Unclaimed user not configured'), { statusCode: 500 });

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, slug: true, ownerId: true },
  });
  if (!business) throw Object.assign(new Error('Business not found'), { statusCode: 404 });
  if (business.ownerId !== unclaimedId) {
    throw Object.assign(new Error('This business is already claimed'), { statusCode: 400 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + CLAIM_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.claimToken.create({
    data: { businessId, email, token, expiresAt },
  });

  const claimUrl = `${frontendUrl}/claim?token=${token}`;
  try {
    await sendEmail({
      to: email,
      subject: `Claim "${business.name}" on FindPro`,
      text: `You requested to claim "${business.name}" on FindPro. Open this link to complete the claim (you may need to sign in or register first):\n\n${claimUrl}\n\nThe link expires in ${CLAIM_EXPIRY_DAYS} days.`,
      html: `<p>You requested to claim <strong>${business.name}</strong> on FindPro.</p><p><a href="${claimUrl}">Complete your claim</a> (sign in or register if needed).</p><p>The link expires in ${CLAIM_EXPIRY_DAYS} days.</p>`,
    });
  } catch (e) {
    console.warn('Claim email failed:', e.message);
  }

  return { message: 'If that email is correct, we sent a claim link.', claimUrl: process.env.NODE_ENV === 'development' ? claimUrl : undefined };
}

/** Admin-initiated: send claim invitation to a business email. Marks claimInvitationSentAt. */
async function sendClaimInvitation(businessId, email) {
  const unclaimedId = await getUnclaimedUserId();
  if (!unclaimedId) throw Object.assign(new Error('Unclaimed user not configured'), { statusCode: 500 });

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, slug: true, ownerId: true },
  });
  if (!business) throw Object.assign(new Error('Business not found'), { statusCode: 404 });
  if (business.ownerId !== unclaimedId) {
    throw Object.assign(new Error('This business is already claimed'), { statusCode: 400 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + CLAIM_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.claimToken.create({
    data: { businessId, email, token, expiresAt },
  });

  const claimUrl = `${frontendUrl}/claim?token=${token}`;
  const subject = `Your business "${business.name}" is listed on FindPro – claim it`;
  const text = `Hi,

${business.name} has been listed on FindPro.co.za, South Africa's home services directory.

Here's how to claim your free listing (takes less than a minute):

1. Click this link: ${claimUrl}

2. Sign in with your email (or create an account if you haven't yet)

3. On the claim page, click the "Claim this business" button

That's it! Once claimed, you can add photos, update your details, and reach more customers from your dashboard.

This link expires in ${CLAIM_EXPIRY_DAYS} days.

— FindPro Team`;
  const html = `<p>Hi,</p>
<p><strong>${business.name}</strong> has been listed on FindPro.co.za, South Africa's home services directory.</p>
<p><strong>Here's how to claim your free listing</strong> (takes less than a minute):</p>
<ol>
  <li>Click this link: <a href="${claimUrl}">${claimUrl}</a></li>
  <li>Sign in with your email (or create an account if you haven't yet)</li>
  <li>On the claim page, click the <strong>"Claim this business"</strong> button</li>
</ol>
<p>That's it! Once claimed, you can add photos, update your details, and reach more customers from your dashboard.</p>
<p>This link expires in ${CLAIM_EXPIRY_DAYS} days.</p>
<p>— FindPro Team</p>`;

  try {
    await sendEmail({ to: email, subject, text, html });
  } catch (e) {
    console.warn('Claim invitation email failed:', e.message);
    throw Object.assign(new Error('Failed to send email: ' + e.message), { statusCode: 500 });
  }

  await prisma.business.update({
    where: { id: businessId },
    data: { claimInvitationSentAt: new Date() },
  });

  return { message: 'Claim invitation sent.', claimUrl: process.env.NODE_ENV === 'development' ? claimUrl : undefined };
}

async function verifyClaimToken(token) {
  const record = await prisma.claimToken.findUnique({
    where: { token },
    include: { business: { select: { id: true, name: true, slug: true } } },
  });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;
  const unclaimedId = await getUnclaimedUserId();
  if (!record.business) return null;
  const business = await prisma.business.findUnique({
    where: { id: record.businessId },
    select: { ownerId: true },
  });
  if (business.ownerId !== unclaimedId) return null;
  return { business: { name: record.business.name, slug: record.business.slug }, valid: true };
}

async function completeClaim(token, userId) {
  const unclaimedId = await getUnclaimedUserId();
  if (!unclaimedId) throw Object.assign(new Error('Unclaimed user not configured'), { statusCode: 500 });

  const record = await prisma.claimToken.findUnique({
    where: { token },
    include: { business: true },
  });
  if (!record) throw Object.assign(new Error('Invalid or expired claim link'), { statusCode: 400 });
  if (record.usedAt) throw Object.assign(new Error('This claim link has already been used'), { statusCode: 400 });
  if (record.expiresAt < new Date()) throw Object.assign(new Error('This claim link has expired'), { statusCode: 400 });
  if (record.business.ownerId !== unclaimedId) {
    throw Object.assign(new Error('This business is already claimed'), { statusCode: 400 });
  }

  await prisma.$transaction([
    prisma.business.update({
      where: { id: record.businessId },
      data: { ownerId: userId },
    }),
    prisma.claimToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  const business = await prisma.business.findUnique({
    where: { id: record.businessId },
    include: { owner: { select: { email: true, name: true } } },
  });
  try {
    if (business?.owner?.email) {
      const dashboardUrl = `${frontendUrl}/dashboard`;
      const listingUrl = `${frontendUrl}/business/${record.business.slug}`;
      await sendEmail({
        to: business.owner.email,
        subject: `You've claimed "${record.business.name}" – FindPro`,
        text: `Hi ${business.owner.name || 'there'}, you've successfully claimed "${record.business.name}" on FindPro. You can now manage it from your dashboard: ${dashboardUrl}. View listing: ${listingUrl}.`,
        html: `<p>Hi ${business.owner.name || 'there'},</p><p>You've successfully claimed <strong>${record.business.name}</strong> on FindPro.</p><p><a href="${dashboardUrl}">Manage in Dashboard</a> · <a href="${listingUrl}">View listing</a></p>`,
      });
    }
  } catch (e) {
    console.warn('Claim-completed email failed:', e.message);
  }

  const businessForResponse = await prisma.business.findUnique({
    where: { id: record.businessId },
    include: {
      city: true,
      owner: { select: { email: true } },
      businessCategories: { include: { category: true } },
      businessServices: { include: { service: true } },
      businessServiceAreas: { include: { city: true } },
      listings: { take: 1, orderBy: { createdAt: 'desc' } },
      media: true,
      reviews: { where: { status: 'approved' } },
    },
  });
  const { buildBusinessResponse } = require('../businesses/businesses.service');
  return buildBusinessResponse(businessForResponse);
}

module.exports = { requestClaim, sendClaimInvitation, verifyClaimToken, completeClaim };
