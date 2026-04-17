/**
 * src/middleware/csrf.js
 * CSRF (Cross-Site Request Forgery) protection using double-submit cookie pattern.
 * 
 * How it works:
 * 1. Server generates a CSRF token and sends it in a cookie + response body
 * 2. Frontend stores the token and sends it in the X-CSRF-Token header
 * 3. Server validates that the header matches the cookie
 * 
 * This protects against CSRF because:
 * - Attackers can't read cookies from other domains (Same-Origin Policy)
 * - So they can't set the X-CSRF-Token header correctly
 */

const { doubleCsrf } = require('csrf-csrf');

const CSRF_SECRET = process.env.CSRF_SECRET || 'shopease-csrf-secret-change-in-production';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ── Configure double-submit CSRF protection ────────────────
const {
  generateCsrfToken,
  doubleCsrfProtection,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  // Session identifier - use IP + User-Agent as fallback for anonymous users
  getSessionIdentifier: (req) => {
    // If user is logged in, use their ID; otherwise use IP
    return req.user?.userId || req.ip || 'anonymous';
  },
  cookieName: IS_PRODUCTION ? '__Host-shopease.x-csrf-token' : 'shopease.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    secure: IS_PRODUCTION,
    path: '/',
    maxAge: 60 * 60 * 1000, // 1 hour
  },
  size: 64, // Token size in bytes
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Don't check CSRF on these methods
  getTokenFromRequest: (req) => req.headers['x-csrf-token'], // Where to look for the token
});

// ── Middleware to generate and send CSRF token ─────────────
const csrfTokenGenerator = (req, res, next) => {
  // Generate token and set it in cookie automatically
  const token = generateCsrfToken(req, res);
  
  // Also attach to request for easy access in routes
  req.csrfToken = token;
  
  next();
};

// ── Error handler for invalid CSRF tokens ──────────────────
const csrfErrorHandler = (err, req, res, next) => {
  if (err === invalidCsrfTokenError) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token. Please refresh and try again.',
      code: 'CSRF_ERROR',
    });
  }
  next(err);
};

// ── Route to get CSRF token (call this on app load) ────────
const getCsrfToken = (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({
    success: true,
    csrfToken: token,
  });
};

// ── Skip CSRF for specific routes (webhooks, etc.) ─────────
const skipCsrfRoutes = [
  '/api/webhooks',
  '/api/health',
];

const conditionalCsrf = (req, res, next) => {
  // Native Android/iOS app requests are not vulnerable to browser CSRF in the same way.
  // They authenticate explicitly via app-controlled requests, not ambient browser cookies.
  if (req.headers['x-shopease-client'] === 'capacitor') {
    return next();
  }

  // Skip CSRF check for certain routes (like webhooks from payment gateways)
  if (skipCsrfRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }
  
  // Apply CSRF protection
  return doubleCsrfProtection(req, res, next);
};

module.exports = {
  csrfTokenGenerator,
  csrfProtection: conditionalCsrf,
  csrfErrorHandler,
  getCsrfToken,
  generateToken: generateCsrfToken,
};
