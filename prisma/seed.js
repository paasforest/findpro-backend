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
];

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

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@findpro.co.za';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const hash = await bcrypt.hash(adminPassword, 12);

  console.log('Seeding admin user...');
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Admin',
      email: adminEmail,
      passwordHash: hash,
      role: 'admin',
    },
  });

  const catList = await prisma.category.findMany();
  const cityList = await prisma.city.findMany();
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });

  const mockBusinesses = [
    { name: 'Spark Electric Solutions', slug: 'spark-electric-solutions', citySlug: 'johannesburg', categorySlug: 'electricians', featured: true },
    { name: 'Cape Plumbing Pros', slug: 'cape-plumbing-pros', citySlug: 'cape-town', categorySlug: 'plumbers', featured: true },
    { name: 'SunPower SA', slug: 'sunpower-sa', citySlug: 'durban', categorySlug: 'solar-installers', featured: true },
    { name: 'BuildRight Construction', slug: 'buildright-construction', citySlug: 'pretoria', categorySlug: 'builders', featured: false },
    { name: 'Perfect Painters JHB', slug: 'perfect-painters-jhb', citySlug: 'johannesburg', categorySlug: 'painters', featured: false },
    { name: 'SecureTech CCTV', slug: 'securetech-cctv', citySlug: 'johannesburg', categorySlug: 'security-cctv', featured: true },
    { name: 'Green Gardens Landscaping', slug: 'green-gardens-landscaping', citySlug: 'cape-town', categorySlug: 'garden-landscaping', featured: false },
    { name: 'CleanPro Services', slug: 'cleanpro-services', citySlug: 'durban', categorySlug: 'cleaning-services', featured: false },
  ];

  console.log('Seeding mock businesses...');
  for (const b of mockBusinesses) {
    const city = cityList.find((c) => c.slug === b.citySlug);
    const category = catList.find((c) => c.slug === b.categorySlug);
    if (!city || !category) continue;

    const existing = await prisma.business.findUnique({ where: { slug: b.slug } });
    if (existing) continue;

    const business = await prisma.business.create({
      data: {
        name: b.name,
        slug: b.slug,
        description: 'Quality service provider in the area. Contact us for a quote.',
        phone: '0111234567',
        whatsapp: '27821234567',
        email: 'info@example.co.za',
        ownerId: admin.id,
        cityId: city.id,
        status: 'active',
        source: 'imported',
        featured: b.featured,
        businessCategories: { create: [{ categoryId: category.id }] },
        listings: {
          create: { plan: b.featured ? 'featured' : 'free', status: 'active' },
        },
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
