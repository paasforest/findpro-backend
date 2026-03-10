const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('SMTP not configured; emails will be logged only.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  const transport = getTransporter();
  const mailOptions = {
    from: process.env.SMTP_USER || 'noreply@findpro.co.za',
    to,
    subject,
    text: text || (html && html.replace(/<[^>]*>/g, '')),
    html,
  };
  if (!transport) {
    console.log('[Email (no SMTP)]', { to, subject, text: (text || html || '').slice(0, 100) });
    return { messageId: 'local' };
  }
  return transport.sendMail(mailOptions);
}

module.exports = { sendEmail };
