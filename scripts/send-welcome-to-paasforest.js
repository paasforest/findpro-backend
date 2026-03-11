/**
 * Send the real welcome email (same as after registration) to a paasforest address.
 * Usage: node scripts/send-welcome-to-paasforest.js [email]
 * Example: node scripts/send-welcome-to-paasforest.js admin@paasforest.com
 * Or set PAASFOREST_TEST_EMAIL in .env and run without args.
 */
require('dotenv').config();
const { sendEmail } = require('../src/utils/sendEmail');

const to = process.argv[2] || process.env.PAASFOREST_TEST_EMAIL || 'admin@paasforest.com';
const name = to.split('@')[0].replace(/[._]/g, ' ') || 'there';
const frontendUrl = process.env.FRONTEND_URL || 'https://findpro.co.za';
const dashboardUrl = `${frontendUrl}/dashboard`;
const addBusinessUrl = `${frontendUrl}/add-business`;

const subject = 'Welcome to FindPro – List your business';
const text = `Hi ${name},\n\nWelcome to FindPro. You're one step away from getting in front of customers.\n\n1. Verify your email using the link we just sent you.\n2. Add your business: ${addBusinessUrl}\n3. Once approved, your listing goes live. Upgrade to Featured or Premium from your dashboard to stand out.\n\nDashboard: ${dashboardUrl}\n\nQuestions? Reply to this email or visit findpro.co.za.`;
const html = `<p>Hi ${name},</p><p>Welcome to <strong>FindPro</strong>. You're one step away from getting in front of customers.</p><ol><li>Verify your email using the link we just sent you.</li><li><a href="${addBusinessUrl}">Add your business</a></li><li>Once approved, your listing goes live. Upgrade to Featured or Premium from your dashboard to stand out.</li></ol><p><a href="${dashboardUrl}">Go to your Dashboard</a></p><p>Questions? Reply to this email or visit findpro.co.za.</p>`;

async function main() {
  console.log('Sending welcome email to', to, '...');
  try {
    const result = await sendEmail({ to, subject, text, html });
    console.log('Sent. messageId:', result?.messageId ?? 'ok');
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  }
}

main();
