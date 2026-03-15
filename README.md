# FindPro Backend

Node.js + Express + PostgreSQL (Prisma) API for the FindPro directory.

## Stack

- **Runtime:** Node.js 20
- **Framework:** Express
- **Database:** PostgreSQL (Prisma ORM)
- **Auth:** JWT + bcrypt
- **Storage:** Local uploads (Hetzner S3 config ready in `src/config/storage.js`)
- **Validation:** Zod

## Setup

1. Copy environment and set values:
   ```bash
   cp .env.example .env
   # Edit .env: DATABASE_URL, JWT_SECRET, FRONTEND_URL, etc.
   ```

2. Install and migrate:
   ```bash
   npm install
   npx prisma migrate deploy
   npx prisma db seed
   ```

3. Run:
   ```bash
   npm run dev
   ```

API base: `http://localhost:5000`

## Main endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| POST | /api/auth/register | Register (business owner) |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Current user (Bearer token) |
| GET | /api/categories | All categories + counts |
| GET | /api/cities | All cities + counts |
| GET | /api/businesses | List (filters: category, city, featured, search, page, limit) |
| GET | /api/businesses/featured | Featured businesses |
| GET | /api/businesses/recent | Recently added |
| GET | /api/businesses/:slug | Single business by slug |
| POST | /api/businesses | Create business (auth) |
| PUT | /api/businesses/:id | Update (owner or admin) |
| DELETE | /api/businesses/:id | Delete (owner or admin) |
| GET | /api/businesses/category/:slug | By category |
| GET | /api/businesses/city/:slug | By city |
| GET | /api/businesses/category/:catSlug/city/:citySlug | By category + city |
| POST | /api/media/upload | Upload image (auth, body: businessId, type) |
| GET | /api/reviews/business/:id | Reviews for business |
| POST | /api/reviews | Submit review (auth) |
| GET | /api/admin/stats | Admin dashboard stats |
| GET | /api/admin/businesses/pending | Pending businesses |
| PUT | /api/admin/businesses/:id/approve | Approve business |
| PUT | /api/admin/businesses/:id/reject | Reject business |

## Seed

- Creates categories, cities, admin user, and sample businesses.
- Admin email: `ADMIN_EMAIL` (default `admin@findpro.co.za`), password: `ADMIN_PASSWORD` (default `ChangeMe123!`).

## Deployment (Hetzner)

- **GitHub:** https://github.com/paasforest/findpro-backend
- **Production:** https://api.findpro.co.za

**Deploy from your machine:**
```bash
./deploy/deploy.sh
```
This rsyncs code to the server, runs `npm install`, `prisma migrate deploy`, and restarts PM2.

**Push to GitHub:**
```bash
git push origin master
```

See `deploy/SERVER-SETUP.md` for Nginx, PM2, SSL, and first-time server setup.
