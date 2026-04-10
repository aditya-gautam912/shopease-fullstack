/**
 * server.js
 * Entry point for the ShopEase Express API.
 * Initialises middleware, mounts all route groups,
 * connects to MongoDB, and starts listening.
 */
require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');
const { sanitize } = require('./src/middleware/sanitize');
const { generalLimiter, apiAbuseLimiter } = require('./src/middleware/rateLimiter');
const { csrfProtection, csrfErrorHandler, getCsrfToken } = require('./src/middleware/csrf');

// ── Route imports ──────────────────────────────────────────
const authRoutes    = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes   = require('./src/routes/orderRoutes');
const userRoutes    = require('./src/routes/userRoutes');
const couponRoutes  = require('./src/routes/couponRoutes');
const adminRoutes   = require('./src/routes/adminRoutes');
const newsletterRoutes = require('./src/routes/newsletterRoutes');
const { productReviewRouter, standaloneRouter: reviewRouter } = require('./src/routes/reviewRoutes');

// ── Bootstrap ──────────────────────────────────────────────
connectDB();

const app = express();

// Allow local web, LAN mobile, and Capacitor origins during development.
// CLIENT_URL can be a comma-separated list for deployed environments.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost',
  'capacitor://localhost',
];

const corsOrigins = new Set([...allowedOrigins, ...defaultDevOrigins]);

// ── Trust proxy (for rate limiting behind reverse proxy) ───
// Enable if behind a load balancer or nginx
app.set('trust proxy', 1);

// ── Serve uploaded product images statically ──────────────
app.use('/uploads', express.static(require('path').join(__dirname, 'public/uploads')));

// ── Security headers (helmet) ──────────────────────────────
// Sets X-Content-Type-Options, X-Frame-Options, X-XSS-Protection,
// Strict-Transport-Security, and more — all in one line.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow /uploads images to load in browser
}));

// ── Global Rate Limiting ───────────────────────────────────
// API abuse prevention: 1000 requests/hour (catches aggressive scrapers)
app.use('/api', apiAbuseLimiter);

// ── Global Middleware ──────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true, // Required for CSRF cookies
}));
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser()); // Required for CSRF cookie parsing

// ── Input Sanitization (XSS + NoSQL injection prevention) ──
app.use(sanitize);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'ShopEase API is running 🚀' });
});

// ── CSRF Token endpoint (call on app load) ─────────────────
app.get('/api/csrf-token', getCsrfToken);

// ── CSRF Protection (applied to state-changing routes) ─────
// Skip for GET/HEAD/OPTIONS requests (configured in csrf.js)
app.use('/api', csrfProtection);

// ── API Routes ─────────────────────────────────────────────
// Auth routes have their own stricter rate limits defined in authRoutes.js
app.use('/api/auth',     authRoutes);

// General API routes with standard rate limiting (100 req/min)
app.use('/api/products', generalLimiter, productRoutes);
app.use('/api/orders',   orderRoutes);  // Has specific order rate limits
app.use('/api/users',    generalLimiter, userRoutes);
app.use('/api/coupons',  generalLimiter, couponRoutes);
app.use('/api/admin',    generalLimiter, adminRoutes);
app.use('/api/newsletter', generalLimiter, newsletterRoutes);
app.use('/api/products/:productId/reviews', productReviewRouter); // Has specific review rate limits
app.use('/api/reviews',  generalLimiter, reviewRouter);

// ── CSRF Error Handler ────────────────────────────────────
app.use(csrfErrorHandler);

// ── 404 handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler (must be last) ───────────────────
app.use(errorHandler);

// ── Start server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀  ShopEase API running on http://localhost:${PORT}`);
  console.log(`📦  Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
