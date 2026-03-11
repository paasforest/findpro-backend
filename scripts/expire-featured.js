/**
 * Expire Featured, Premium, Boost, Homepage slot, and City ad when until date has passed.
 * Run daily via cron: 0 1 * * * cd /root/findpro-backend && node scripts/expire-featured.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const expiredFeatured = await prisma.business.findMany({
    where: { featured: true, featuredUntil: { lt: now } },
    select: { id: true, name: true, slug: true, featuredUntil: true },
  });
  if (expiredFeatured.length > 0) {
    await prisma.business.updateMany({
      where: { id: { in: expiredFeatured.map((b) => b.id) } },
      data: { featured: false, featuredUntil: null },
    });
    console.log(`Expired ${expiredFeatured.length} featured listing(s):`);
    expiredFeatured.forEach((b) => {
      console.log(`  - ${b.name} (${b.slug}) featured until ${b.featuredUntil?.toISOString().slice(0, 10)}`);
    });
  }

  const expiredPremium = await prisma.business.findMany({
    where: { premium: true, premiumUntil: { lt: now } },
    select: { id: true, name: true, slug: true, premiumUntil: true },
  });
  if (expiredPremium.length > 0) {
    await prisma.business.updateMany({
      where: { id: { in: expiredPremium.map((b) => b.id) } },
      data: { premium: false, premiumUntil: null },
    });
    console.log(`Expired ${expiredPremium.length} premium listing(s):`);
    expiredPremium.forEach((b) => {
      console.log(`  - ${b.name} (${b.slug}) premium until ${b.premiumUntil?.toISOString().slice(0, 10)}`);
    });
  }

  const expiredBoosted = await prisma.business.findMany({
    where: { boosted: true, boostedUntil: { lt: now } },
    select: { id: true, name: true, slug: true, boostedUntil: true },
  });
  if (expiredBoosted.length > 0) {
    await prisma.business.updateMany({
      where: { id: { in: expiredBoosted.map((b) => b.id) } },
      data: { boosted: false, boostedUntil: null },
    });
    console.log(`Expired ${expiredBoosted.length} boost(s):`);
    expiredBoosted.forEach((b) => {
      console.log(`  - ${b.name} (${b.slug}) boosted until ${b.boostedUntil?.toISOString().slice(0, 10)}`);
    });
  }

  const expiredHomepageSlot = await prisma.business.findMany({
    where: { homepageSlotUntil: { lt: now } },
    select: { id: true, name: true, slug: true, homepageSlotUntil: true },
  });
  if (expiredHomepageSlot.length > 0) {
    await prisma.business.updateMany({
      where: { id: { in: expiredHomepageSlot.map((b) => b.id) } },
      data: { homepageSlotUntil: null },
    });
    console.log(`Expired ${expiredHomepageSlot.length} homepage slot(s):`);
    expiredHomepageSlot.forEach((b) => {
      console.log(`  - ${b.name} (${b.slug})`);
    });
  }

  const expiredCityAd = await prisma.business.findMany({
    where: { cityAdUntil: { lt: now } },
    select: { id: true, name: true, slug: true, cityAdUntil: true },
  });
  if (expiredCityAd.length > 0) {
    await prisma.business.updateMany({
      where: { id: { in: expiredCityAd.map((b) => b.id) } },
      data: { cityAdUntil: null },
    });
    console.log(`Expired ${expiredCityAd.length} city ad(s):`);
    expiredCityAd.forEach((b) => {
      console.log(`  - ${b.name} (${b.slug})`);
    });
  }

  if (
    expiredFeatured.length === 0 &&
    expiredPremium.length === 0 &&
    expiredBoosted.length === 0 &&
    expiredHomepageSlot.length === 0 &&
    expiredCityAd.length === 0
  ) {
    console.log('No listings to expire.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
