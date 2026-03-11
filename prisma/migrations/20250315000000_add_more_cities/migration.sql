-- Add more cities/areas for better local search (e.g. electrician Sandton, plumbers Randburg)
-- Idempotent: ON CONFLICT DO NOTHING so safe to run again
INSERT INTO "City" (id, name, province, slug, "createdAt")
VALUES
  (gen_random_uuid(), 'Sandton', 'Gauteng', 'sandton', NOW()),
  (gen_random_uuid(), 'Randburg', 'Gauteng', 'randburg', NOW()),
  (gen_random_uuid(), 'Centurion', 'Gauteng', 'centurion', NOW()),
  (gen_random_uuid(), 'Midrand', 'Gauteng', 'midrand', NOW()),
  (gen_random_uuid(), 'Roodepoort', 'Gauteng', 'roodepoort', NOW()),
  (gen_random_uuid(), 'Fourways', 'Gauteng', 'fourways', NOW()),
  (gen_random_uuid(), 'Rosebank', 'Gauteng', 'rosebank', NOW()),
  (gen_random_uuid(), 'Alberton', 'Gauteng', 'alberton', NOW()),
  (gen_random_uuid(), 'Kempton Park', 'Gauteng', 'kempton-park', NOW()),
  (gen_random_uuid(), 'Vereeniging', 'Gauteng', 'vereeniging', NOW()),
  (gen_random_uuid(), 'Bellville', 'Western Cape', 'bellville', NOW()),
  (gen_random_uuid(), 'Stellenbosch', 'Western Cape', 'stellenbosch', NOW()),
  (gen_random_uuid(), 'Somerset West', 'Western Cape', 'somerset-west', NOW()),
  (gen_random_uuid(), 'Paarl', 'Western Cape', 'paarl', NOW()),
  (gen_random_uuid(), 'George', 'Western Cape', 'george', NOW()),
  (gen_random_uuid(), 'Constantia', 'Western Cape', 'constantia', NOW()),
  (gen_random_uuid(), 'Sea Point', 'Western Cape', 'sea-point', NOW()),
  (gen_random_uuid(), 'Umhlanga', 'KwaZulu-Natal', 'umhlanga', NOW()),
  (gen_random_uuid(), 'Pietermaritzburg', 'KwaZulu-Natal', 'pietermaritzburg', NOW()),
  (gen_random_uuid(), 'Ballito', 'KwaZulu-Natal', 'ballito', NOW()),
  (gen_random_uuid(), 'Westville', 'KwaZulu-Natal', 'westville', NOW()),
  (gen_random_uuid(), 'Rustenburg', 'North West', 'rustenburg', NOW())
ON CONFLICT (slug) DO NOTHING;
