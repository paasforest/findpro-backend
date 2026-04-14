const { Resend } = require('resend');
const nodemailer = require('nodemailer');

let transporter = null;
let resendClient = null;

function getResend() {
  if (resendClient) return resendClient;
  if (process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
    return resendClient;
  }
  return null;
}

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null;
  }
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

// Sender must use verified domain mail.findpro.co.za (Resend). Set RESEND_FROM in .env if different.
function getFrom() {
  return process.env.RESEND_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'FindPro <noreply@mail.findpro.co.za>';
}

async function sendEmail({ to, subject, text, html }) {
  const toAddress = Array.isArray(to) ? to[0] : to;
  const plainText = text || (html && html.replace(/<[^>]*>/g, ''));

  if (process.env.RESEND_API_KEY) {
    const resend = getResend();
    if (resend) {
      try {
        const { data, error } = await resend.emails.send({
          from: getFrom(),
          to: toAddress,
          subject,
          html: html || undefined,
          text: plainText || undefined,
        });
        if (error) {
          console.warn('[Resend error]', error.message);
          return { messageId: null };
        }
        return { messageId: data?.id || 'resend' };
      } catch (e) {
        console.warn('Resend send failed:', e.message);
        return { messageId: null };
      }
    }
  }

  const transport = getTransporter();
  if (!transport) {
    console.log('[Email (no provider)]', { to: toAddress, subject, text: (plainText || html || '').slice(0, 100) });
    return { messageId: 'local' };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'FindPro <noreply@mail.findpro.co.za>',
    to: toAddress,
    subject,
    text: plainText,
    html,
  };
  return transport.sendMail(mailOptions);
}

module.exports = { sendEmail };
