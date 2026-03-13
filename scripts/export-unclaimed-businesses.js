/**
 * Export all unclaimed businesses to CSV for outreach (finding emails, manual contact).
 * Output: name, slug, phone, city, category, website, email, claim_page_url, invitation_sent_at
 *
 * Run: node scripts/export-unclaimed-businesses.js
 * Output: scripts/unclaimed-businesses-export.csv
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const UNCLAIMED_EMAIL = process.env.UNCLAIMED_EMAIL || 'unclaimed@findpro.co.za';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://findpro.co.za';

function escapeCsv(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function main() {
  const unclaimedUser = await prisma.user.findUnique({
    where: { email: UNCLAIMED_EMAIL },
    select: { id: true },
  });
  if (!unclaimedUser) {
    console.error('Unclaimed user not found. Run seed first.');
    process.exit(1);
  }

  const businesses = await prisma.business.findMany({
    where: { ownerId: unclaimedUser.id, status: 'active' },
    include: {
      city: true,
      businessCategories: { include: { category: true } },
    },
    orderBy: { name: 'asc' },
  });

  function phoneToWhatsApp(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('0')) return '27' + digits.slice(1);
    if (digits.startsWith('27')) return digits;
    return '27' + digits;
  }

  const headers = [
    'name',
    'slug',
    'phone',
    'city',
    'category',
    'website',
    'email',
    'claim_page_url',
    'whatsapp_url',
    'invitation_sent_at',
  ];

  const rows = businesses.map((b) => {
    const category = b.businessCategories?.[0]?.category?.name ?? '';
    const claimPageUrl = `${FRONTEND_URL}/business/${b.slug}`;
    const msg = `Hi, ${b.name} is listed on FindPro.co.za – South Africa's home services directory. Claim your free listing to add photos and reach more customers: ${claimPageUrl}`;
    const whatsappNum = phoneToWhatsApp(b.phone);
    const whatsappUrl = whatsappNum ? `https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}` : '';
    const invitationSentAt = b.claimInvitationSentAt
      ? b.claimInvitationSentAt.toISOString().slice(0, 10)
      : '';

    return [
      escapeCsv(b.name),
      escapeCsv(b.slug),
      escapeCsv(b.phone),
      escapeCsv(b.city?.name ?? ''),
      escapeCsv(category),
      escapeCsv(b.website ?? ''),
      escapeCsv(b.email ?? ''),
      escapeCsv(claimPageUrl),
      escapeCsv(whatsappUrl),
      escapeCsv(invitationSentAt),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const outPath = path.join(__dirname, 'unclaimed-businesses-export.csv');
  fs.writeFileSync(outPath, csv, 'utf8');

  console.log(`Exported ${businesses.length} unclaimed businesses to ${outPath}`);
  const contacted = businesses.filter((b) => b.claimInvitationSentAt).length;
  console.log(`  - Already contacted: ${contacted}`);
  console.log(`  - Pending: ${businesses.length - contacted}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
