const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { rateLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const businessRoutes = require('./modules/businesses/businesses.routes');
const categoryRoutes = require('./modules/categories/categories.routes');
const cityRoutes = require('./modules/cities/cities.routes');
const listingRoutes = require('./modules/listings/listings.routes');
const mediaRoutes = require('./modules/media/media.routes');
const reviewRoutes = require('./modules/reviews/reviews.routes');
const paymentRoutes = require('./modules/payments/payments.routes');
const servicesRoutes = require('./modules/services/services.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

app.use(helmet());
// CORS root cause: with credentials: true the server must NOT use Access-Control-Allow-Origin: *
// or the browser blocks the response ("Failed to fetch"). So we always reflect the request origin
// when allowed, or use allowlist from FRONTEND_URL (comma-separated).
// Also allow www/non-www sibling: if FRONTEND_URL has https://findpro.co.za, allow https://www.findpro.co.za too.
const corsOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean)
  : [];

function originSibling(origin) {
  try {
    const u = new URL(origin);
    const host = u.hostname;
    const siblingHost = host.startsWith('www.') ? host.slice(4) : 'www.' + host;
    return u.protocol + '//' + siblingHost + (u.port ? ':' + u.port : '');
  } catch {
    return null;
  }
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (corsOrigins.includes(origin)) return true;
  const sibling = originSibling(origin);
  return sibling && corsOrigins.includes(sibling);
}

const corsOptions = {
  origin: corsOrigins.length
    ? (origin, cb) => {
        if (!origin) return cb(null, corsOrigins[0]);
        if (isOriginAllowed(origin)) return cb(null, origin);
        return cb(null, false);
      }
    : true, // no allowlist => reflect any request origin (fixes "can't fetch" when FRONTEND_URL was unset)
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('combined'));
app.use(rateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/admin', adminRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', platform: 'FindPro' }));

app.use(errorHandler);

module.exports = app;
