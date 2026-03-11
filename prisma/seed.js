const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const categories = [
  { name: 'Electricians', slug: 'electricians', icon: '⚡' },
  { name: 'Plumbers', slug: 'plumbers', icon: '🔧' },
  { name: 'Solar Installers', slug: 'solar-installers', icon: '☀️' },
  { name: 'Renovations / Builders', slug: 'builders', icon: '🏗️' },
  { name: 'Painters', slug: 'painters', icon: '🎨' },
  { name: 'Cleaning Services', slug: 'cleaning-services', icon: '🧹' },
  { name: 'Security / CCTV', slug: 'security-cctv', icon: '📹' },
  { name: 'Appliance Repair', slug: 'appliance-repair', icon: '🔌' },
  { name: 'Pest Control', slug: 'pest-control', icon: '🐜' },
  { name: 'Garden / Landscaping', slug: 'garden-landscaping', icon: '🌿' },
];

const cities = [
  { name: 'Johannesburg', province: 'Gauteng', slug: 'johannesburg' },
  { name: 'Pretoria', province: 'Gauteng', slug: 'pretoria' },
  { name: 'Cape Town', province: 'Western Cape', slug: 'cape-town' },
  { name: 'Durban', province: 'KwaZulu-Natal', slug: 'durban' },
  { name: 'Port Elizabeth', province: 'Eastern Cape', slug: 'port-elizabeth' },
  { name: 'Bloemfontein', province: 'Free State', slug: 'bloemfontein' },
  { name: 'East London', province: 'Eastern Cape', slug: 'east-london' },
  { name: 'Nelspruit', province: 'Mpumalanga', slug: 'nelspruit' },
  { name: 'Polokwane', province: 'Limpopo', slug: 'polokwane' },
  { name: 'Kimberley', province: 'Northern Cape', slug: 'kimberley' },
  // More areas (Phase 1 – electrician Sandton, etc.)
  { name: 'Sandton', province: 'Gauteng', slug: 'sandton' },
  { name: 'Randburg', province: 'Gauteng', slug: 'randburg' },
  { name: 'Centurion', province: 'Gauteng', slug: 'centurion' },
  { name: 'Midrand', province: 'Gauteng', slug: 'midrand' },
  { name: 'Roodepoort', province: 'Gauteng', slug: 'roodepoort' },
  { name: 'Fourways', province: 'Gauteng', slug: 'fourways' },
  { name: 'Rosebank', province: 'Gauteng', slug: 'rosebank' },
  { name: 'Alberton', province: 'Gauteng', slug: 'alberton' },
  { name: 'Kempton Park', province: 'Gauteng', slug: 'kempton-park' },
  { name: 'Vereeniging', province: 'Gauteng', slug: 'vereeniging' },
  { name: 'Bellville', province: 'Western Cape', slug: 'bellville' },
  { name: 'Stellenbosch', province: 'Western Cape', slug: 'stellenbosch' },
  { name: 'Somerset West', province: 'Western Cape', slug: 'somerset-west' },
  { name: 'Paarl', province: 'Western Cape', slug: 'paarl' },
  { name: 'George', province: 'Western Cape', slug: 'george' },
  { name: 'Constantia', province: 'Western Cape', slug: 'constantia' },
  { name: 'Sea Point', province: 'Western Cape', slug: 'sea-point' },
  { name: 'Umhlanga', province: 'KwaZulu-Natal', slug: 'umhlanga' },
  { name: 'Pietermaritzburg', province: 'KwaZulu-Natal', slug: 'pietermaritzburg' },
  { name: 'Ballito', province: 'KwaZulu-Natal', slug: 'ballito' },
  { name: 'Westville', province: 'KwaZulu-Natal', slug: 'westville' },
  { name: 'Rustenburg', province: 'North West', slug: 'rustenburg' },
  { name: 'Hermanus', province: 'Western Cape', slug: 'hermanus' },
  { name: 'Gansbaai', province: 'Western Cape', slug: 'gansbaai' },
];

// Services per category (categorySlug -> list of { name, slug }). Enables filter-by-service like other directories.
const servicesByCategory = {
  electricians: [
    { name: 'COC certificates', slug: 'coc-certificates' },
    { name: 'Fault finding', slug: 'fault-finding' },
    { name: 'Solar wiring', slug: 'solar-wiring' },
    { name: 'Rewiring', slug: 'rewiring' },
    { name: 'DB board upgrades', slug: 'db-board-upgrades' },
  ],
  plumbers: [
    { name: 'Geyser installation & repair', slug: 'geyser-installation-repair' },
    { name: 'Blockages', slug: 'blockages' },
    { name: 'Bathroom plumbing', slug: 'bathroom-plumbing' },
    { name: 'Leak detection', slug: 'leak-detection' },
  ],
  'solar-installers': [
    { name: 'Solar panel installation', slug: 'solar-panel-installation' },
    { name: 'Inverter installation', slug: 'inverter-installation' },
    { name: 'Battery storage', slug: 'battery-storage' },
  ],
  builders: [
    { name: 'Renovations', slug: 'renovations' },
    { name: 'New builds', slug: 'new-builds' },
    { name: 'Extensions', slug: 'extensions' },
  ],
  painters: [
    { name: 'Interior painting', slug: 'interior-painting' },
    { name: 'Exterior painting', slug: 'exterior-painting' },
    { name: 'Spray painting', slug: 'spray-painting' },
  ],
  'cleaning-services': [
    { name: 'Deep cleaning', slug: 'deep-cleaning' },
    { name: 'Regular domestic', slug: 'regular-domestic' },
    { name: 'Office cleaning', slug: 'office-cleaning' },
  ],
  'security-cctv': [
    { name: 'CCTV installation', slug: 'cctv-installation' },
    { name: 'Alarm systems', slug: 'alarm-systems' },
    { name: 'Access control', slug: 'access-control' },
  ],
  'appliance-repair': [
    { name: 'Fridge & freezer', slug: 'fridge-freezer' },
    { name: 'Washing machine', slug: 'washing-machine' },
    { name: 'Stove & oven', slug: 'stove-oven' },
  ],
  'pest-control': [
    { name: 'Fumigation', slug: 'fumigation' },
    { name: 'Rodent control', slug: 'rodent-control' },
    { name: 'Termite treatment', slug: 'termite-treatment' },
  ],
  'garden-landscaping': [
    { name: 'Garden design', slug: 'garden-design' },
    { name: 'Lawn installation', slug: 'lawn-installation' },
    { name: 'Irrigation', slug: 'irrigation' },
  ],
};

async function main() {
  console.log('Seeding categories...');
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  console.log('Seeding cities...');
  for (const c of cities) {
    await prisma.city.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  console.log('Seeding services (per category)...');
  const catListForServices = await prisma.category.findMany();
  for (const [categorySlug, services] of Object.entries(servicesByCategory)) {
    const category = catListForServices.find((c) => c.slug === categorySlug);
    if (!category) continue;
    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      await prisma.service.upsert({
        where: { slug: s.slug },
        update: {},
        create: { name: s.name, slug: s.slug, categoryId: category.id, sortOrder: i },
      });
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@findpro.co.za';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const hash = await bcrypt.hash(adminPassword, 12);

  console.log('Seeding admin user...');
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hash },
    create: {
      name: 'Admin',
      email: adminEmail,
      passwordHash: hash,
      role: 'admin',
    },
  });

  // Remove mock data and everything associated: mock businesses, their listings, reviews, media, payments, then demo pro account
  const mockSlugs = [
    'spark-electric-solutions',
    'cape-plumbing-pros',
    'sunpower-sa',
    'buildright-construction',
    'perfect-painters-jhb',
    'securetech-cctv',
    'green-gardens-landscaping',
    'cleanpro-services',
  ];
  const mockBusinesses = await prisma.business.findMany({ where: { slug: { in: mockSlugs } }, select: { id: true } });
  const mockIds = mockBusinesses.map((b) => b.id);
  if (mockIds.length > 0) {
    await prisma.payment.deleteMany({ where: { businessId: { in: mockIds } } });
    await prisma.business.deleteMany({ where: { id: { in: mockIds } } });
    console.log(`Removed ${mockIds.length} mock business(es) and associated data.`);
  }
  const deletedUser = await prisma.user.deleteMany({ where: { email: 'demo@findpro.co.za' } });
  if (deletedUser.count > 0) {
    console.log('Removed demo pro account (demo@findpro.co.za).');
  }

  // Backfill: ensure existing businesses have at least one service area (primary city)
  const businessesWithoutArea = await prisma.business.findMany({
    where: { businessServiceAreas: { none: {} } },
    select: { id: true, cityId: true },
  });
  for (const b of businessesWithoutArea) {
    await prisma.businessServiceArea.upsert({
      where: { businessId_cityId: { businessId: b.id, cityId: b.cityId } },
      update: {},
      create: { businessId: b.id, cityId: b.cityId },
    });
  }
  if (businessesWithoutArea.length > 0) {
    console.log(`Backfilled service area for ${businessesWithoutArea.length} existing business(es).`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
