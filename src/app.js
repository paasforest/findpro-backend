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
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
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
app.use('/api/admin', adminRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', platform: 'FindPro' }));

app.use(errorHandler);

module.exports = app;
