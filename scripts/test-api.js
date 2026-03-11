#!/usr/bin/env node
/**
 * FindPro API test script. Runs against local or remote API.
 *
 * Usage:
 *   node scripts/test-api.js
 *   BASE_URL=https://api.findpro.co.za node scripts/test-api.js
 *
 * Optional (admin tests): set ADMIN_EMAIL and ADMIN_PASSWORD to test login + admin stats.
 */

const BASE = process.env.BASE_URL || 'http://localhost:5000';
let passed = 0;
let failed = 0;

function log(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? ` – ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` – ${detail}` : ''}`);
  }
}

async function fetchOk(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return res;
}

async function run() {
  console.log(`\nFindPro API tests – ${BASE}\n`);

  // —— Health ——
  try {
    const health = await fetchOk(`${BASE}/api/health`);
    const data = await health.json();
    log('GET /api/health', health.ok && data.status === 'ok');
  } catch (e) {
    log('GET /api/health', false, e.message);
  }

  // —— Categories ——
  try {
    const cat = await fetchOk(`${BASE}/api/categories`);
    const list = await cat.json();
    log('GET /api/categories', cat.ok && Array.isArray(list));
  } catch (e) {
    log('GET /api/categories', false, e.message);
  }

  // —— Cities ——
  try {
    const cities = await fetchOk(`${BASE}/api/cities`);
    const cityList = await cities.json();
    log('GET /api/cities', cities.ok && Array.isArray(cityList));
  } catch (e) {
    log('GET /api/cities', false, e.message);
  }

  // —— Businesses list ——
  let firstSlug = null;
  let unclaimedBusinessId = null;
  try {
    const biz = await fetchOk(`${BASE}/api/businesses?limit=5`);
    const json = await biz.json();
    const ok = biz.ok && json.data && Array.isArray(json.data);
    log('GET /api/businesses', ok);
    if (ok && json.data.length > 0) {
      firstSlug = json.data[0].slug;
      const unclaimed = json.data.find((b) => b.isUnclaimed === true);
      if (unclaimed) unclaimedBusinessId = unclaimed.id;
    }
  } catch (e) {
    log('GET /api/businesses', false, e.message);
  }

  // —— Business by slug ——
  if (firstSlug) {
    try {
      const one = await fetchOk(`${BASE}/api/businesses/${encodeURIComponent(firstSlug)}`);
      const oneData = await one.json();
      log('GET /api/businesses/:slug', one.ok && oneData.slug === firstSlug);
    } catch (e) {
      log('GET /api/businesses/:slug', false, e.message);
    }
  }

  // —— Claim verify (invalid token) ——
  try {
    const verify = await fetchOk(`${BASE}/api/claim/verify?token=invalid-token-12345`);
    log('GET /api/claim/verify (invalid token)', verify.status === 404 || verify.status === 400);
  } catch (e) {
    log('GET /api/claim/verify', false, e.message);
  }

  // —— Claim verify (missing token) ——
  try {
    const noToken = await fetchOk(`${BASE}/api/claim/verify`);
    log('GET /api/claim/verify (no token)', noToken.status === 400);
  } catch (e) {
    log('GET /api/claim/verify (no token)', false, e.message);
  }

  // —— Claim request (invalid businessId) ——
  try {
    const badRequest = await fetchOk(`${BASE}/api/claim/request`, {
      method: 'POST',
      body: JSON.stringify({
        businessId: '00000000-0000-0000-0000-000000000000',
        email: 'test@example.com',
      }),
    });
    log('POST /api/claim/request (invalid businessId)', badRequest.status === 404 || badRequest.status === 400);
  } catch (e) {
    log('POST /api/claim/request', false, e.message);
  }

  // —— Claim request (valid unclaimed business, if any) ——
  if (unclaimedBusinessId) {
    try {
      const claimReq = await fetchOk(`${BASE}/api/claim/request`, {
        method: 'POST',
        body: JSON.stringify({
          businessId: unclaimedBusinessId,
          email: 'claim-test@example.com',
        }),
      });
      const claimData = await claimReq.json();
      log(
        'POST /api/claim/request (unclaimed business)',
        claimReq.ok && (claimData.message || claimData.error !== 'This business is already claimed'),
        claimReq.ok ? 'message sent' : (claimData.error || claimReq.status)
      );
    } catch (e) {
      log('POST /api/claim/request (unclaimed)', false, e.message);
    }
  } else {
    console.log('  \x1b[33m⊘\x1b[0m POST /api/claim/request (unclaimed) – skip (no unclaimed business in list)');
  }

  // —— Auth login (optional, for admin tests) ——
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  let token = null;
  if (adminEmail && adminPassword) {
    try {
      const loginRes = await fetchOk(`${BASE}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok && loginData.token) {
        token = loginData.token;
        log('POST /api/auth/login (admin)', true);
      } else {
        log('POST /api/auth/login (admin)', false, loginData.error || loginRes.status);
      }
    } catch (e) {
      log('POST /api/auth/login', false, e.message);
    }
  }

  // —— Admin stats (if token) ——
  if (token) {
    try {
      const statsRes = await fetchOk(`${BASE}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      log('GET /api/admin/stats', statsRes.ok && typeof statsData.totalBusinesses === 'number');
    } catch (e) {
      log('GET /api/admin/stats', false, e.message);
    }
  }

  // —— Summary ——
  console.log('');
  console.log(`  \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
