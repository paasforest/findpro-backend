const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html, text }) => {
  const payload = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
  };
  if (html) payload.html = html;
  if (text) payload.text = text;
  if (!html && !text) {
    throw new Error('sendEmail requires html or text');
  }
  const { data, error } = await resend.emails.send(payload);
  if (error) throw new Error(error.message);
  return data;
};

module.exports = sendEmail;
