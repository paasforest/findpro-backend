-- Phase 3: Boosts (R25, 7d), Homepage slot (R175, 30d), City page ad (R200, 30d)
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "boosted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "boostedUntil" TIMESTAMP(3);
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "homepageSlotUntil" TIMESTAMP(3);
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "cityAdUntil" TIMESTAMP(3);
