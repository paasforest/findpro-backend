/**
 * Send a test welcome email to a given address.
 * Usage: node scripts/send-test-welcome-email.js [email]
 * Example: node scripts/send-test-welcome-email.js christiaanbanda@gmail.com
 * Requires: .env with RESEND_API_KEY (Resend SDK) or SMTP_* (Resend SMTP / other).
 */
require('dotenv').config();
const { sendEmail } = require('../src/utils/sendEmail');

function getFrom() {
  return process.env.RESEND_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'FindPro <noreply@mail.findpro.co.za>';
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
    if (result?.messageId === null) {
      console.error('Email was not sent (Resend returned an error — check RESEND_API_KEY and logs above).');
      process.exit(1);
    }
    if (result?.messageId === 'local') {
      console.warn('No email provider configured; message was only logged locally.');
      process.exit(1);
    }
    console.log('Sent. messageId:', result.messageId);
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  }
}

main();
