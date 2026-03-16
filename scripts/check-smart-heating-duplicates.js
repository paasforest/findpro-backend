/**
 * Check Smart Heating Energy Solutions duplicates (Randburg vs Johannesburg).
 * Usage: node scripts/check-smart-heating-duplicates.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const businesses = await prisma.business.findMany({
    where: { name: { contains: 'SMART HEATING', mode: 'insensitive' } },
    include: {
      city: true,
      businessServiceAreas: { include: { city: true } },
      businessCategories: { include: { category: true } },
    },
  });

  console.log('Found', businesses.length, 'business(es):\n');
  businesses.forEach((b, i) => {
    console.log(`--- Record ${i + 1} ---`);
    console.log('ID:', b.id);
    console.log('Name:', b.name);
    console.log('Slug:', b.slug);
    console.log('City:', b.city?.name, '(cityId:', b.cityId + ')');
    console.log('Categories:', b.businessCategories?.map((bc) => bc.category?.slug).join(', ') || 'N/A');
    console.log('Service areas:', b.businessServiceAreas?.map((a) => a.city?.name).join(', ') || 'none');
    console.log('');
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
