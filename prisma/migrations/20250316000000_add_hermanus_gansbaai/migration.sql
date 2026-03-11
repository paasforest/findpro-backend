-- Add Hermanus and Gansbaai (Western Cape) for plumber listings
INSERT INTO "City" (id, name, province, slug, "createdAt")
VALUES
  (gen_random_uuid(), 'Hermanus', 'Western Cape', 'hermanus', NOW()),
  (gen_random_uuid(), 'Gansbaai', 'Western Cape', 'gansbaai', NOW())
ON CONFLICT (slug) DO NOTHING;
