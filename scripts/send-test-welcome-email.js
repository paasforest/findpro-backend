/**
 * Send a test welcome email to a given address.
 * Usage: node scripts/send-test-welcome-email.js [email]
 * Example: node scripts/send-test-welcome-email.js christiaanbanda@gmail.com
 * Requires: .env with RESEND_API_KEY or SMTP_* set.
 */
require('dotenv').config();
const { sendEmail } = require('../src/utils/sendEmail');

// Resend requires From to use your verified domain (e.g. noreply@mail.findpro.co.za). Set RESEND_FROM in .env.
function getFrom() {
  return process.env.RESEND_FROM || process.env.SMTP_USER || 'FindPro <noreply@mail.findpro.co.za>';
}

const to = process.argv[2] || 'christiaanbanda@gmail.com';
const name = to.split('@')[0].replace(/[._]/g, ' ') || 'there';
const frontendUrl = process.env.FRONTEND_URL || 'https://findpro.co.za';
const dashboardUrl = `${frontendUrl}/dashboard`;
const addBusinessUrl = `${frontendUrl}/add-business`;

const subject = 'Welcome to FindPro – List your business (test)';
const text = `Hi ${name},\n\nWelcome to FindPro. You're one step away from getting in front of customers.\n\n1. Verify your email using the link we just sent you.\n2. Add your business: ${addBusinessUrl}\n3. Once approved, your listing goes live. Upgrade to Featured or Premium from your dashboard to stand out.\n\nDashboard: ${dashboardUrl}\n\nQuestions? Reply to this email or visit findpro.co.za.\n\n(This was a test send from FindPro.)`;
const html = `<p>Hi ${name},</p><p>Welcome to <strong>FindPro</strong>. You're one step away from getting in front of customers.</p><ol><li>Verify your email using the link we just sent you.</li><li><a href="${addBusinessUrl}">Add your business</a></li><li>Once approved, your listing goes live. Upgrade to Featured or Premium from your dashboard to stand out.</li></ol><p><a href="${dashboardUrl}">Go to your Dashboard</a></p><p>Questions? Reply to this email or visit findpro.co.za.</p><p><em>(This was a test send from FindPro.)</em></p>`;

async function main() {
  console.log('From:', getFrom());
  console.log('To:', to);
  console.log('Sending test welcome email...');
  try {
    const result = await sendEmail({ to, subject, text, html });
    console.log('Sent. messageId:', result?.messageId ?? 'ok');
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  }
}

main();
