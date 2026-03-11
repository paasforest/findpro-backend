/**
 * Register a user with a paasforest email so the backend sends the real verification + welcome emails.
 * Usage: node scripts/register-paasforest.js [email]
 * Example: node scripts/register-paasforest.js admin@paasforest.com
 * Requires: API_URL in .env (e.g. https://api.findpro.co.za) or pass as second arg.
 */
require('dotenv').config();

const email = process.argv[2] || process.env.PAASFOREST_TEST_EMAIL || 'admin@paasforest.com';
const apiUrl = process.argv[3] || process.env.API_URL || 'https://api.findpro.co.za';
const name = email.split('@')[0].replace(/[._]/g, ' ') || 'Paasforest';
const password = process.env.REGISTER_TEST_PASSWORD || 'PaasforestTest1';

async function main() {
  const url = `${apiUrl.replace(/\/$/, '')}/api/auth/register`;
  console.log('Registering', email, 'at', url, '...');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.error?.email) console.error('Error:', data.error.email);
      else if (data.error) console.error('Error:', typeof data.error === 'object' ? JSON.stringify(data.error) : data.error);
      else console.error('Error:', res.status, res.statusText);
      process.exit(1);
    }
    console.log('Registered. Check', email, 'for verification + welcome emails.');
    if (data.token) console.log('Token received (user is logged in).');
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  }
}

main();
