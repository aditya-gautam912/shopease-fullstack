/**
 * src/controllers/authController.js
 * Handles user registration, login, and token refresh.
 * Implements secure refresh token rotation.
 */

const User          = require('../models/User');
const { generateTokens } = require('../utils/generateToken');
const asyncHandler  = require('../utils/asyncHandler');
const crypto        = require('crypto');
const jwt           = require('jsonwebtoken');
const { sendPasswordReset, sendWelcomeEmail } = require('../services/emailService');

// ── Helper: strip sensitive fields from user doc ───────────
const sanitiseUser = (user) => ({
  _id:             user._id,
  name:            user.name,
  email:           user.email,
  role:            user.role,
  isEmailVerified: true,
  addresses:       user.addresses,
  wishlist:        user.wishlist,
  createdAt:       user.createdAt,
});

// ── Helper: hash refresh token for storage ─────────────────
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ── Helper: save refresh token to user ─────────────────────
const saveRefreshToken = async (user, refreshToken) => {
  const hashedToken = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Remove expired tokens and limit to 5 devices
  user.refreshTokens = user.refreshTokens
    .filter(rt => rt.expiresAt > new Date())
    .slice(-4); // Keep only last 4, new one will be 5th
  
  user.refreshTokens.push({ token: hashedToken, expiresAt });
  await user.save();
};

// ── POST /api/auth/register ────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check for existing account
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'An account with that email already exists',
    });
  }

  const user = await User.create({ 
    name, 
    email, 
    password,
    isEmailVerified: true,
  });
  
  const { accessToken, refreshToken } = generateTokens(user);
  
  // Save refresh token
  await saveRefreshToken(user, refreshToken);

  // Send welcome email (non-blocking)
  sendWelcomeEmail(user).catch((err) =>
    console.error('Failed to send welcome email:', err)
  );

  res.status(201).json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: sanitiseUser(user),
    },
    message: 'Registration successful!',
  });
});

// ── POST /api/auth/login ───────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Explicitly select password (it is excluded by default in the schema)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  if (!user.isEmailVerified) {
    user.isEmailVerified = true;
  }

  const { accessToken, refreshToken } = generateTokens(user);
  
  // Save refresh token
  await saveRefreshToken(user, refreshToken);

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: sanitiseUser(user),
    },
  });
});

// ── POST /api/auth/refresh ─────────────────────────────────
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is required',
    });
  }

  // Verify the refresh token
  let decoded;
  try {
    decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
    );
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }

  // Find user and check if refresh token exists
  const user = await User.findById(decoded.userId);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'User not found',
    });
  }

  const hashedToken = hashToken(refreshToken);
  const tokenIndex = user.refreshTokens.findIndex(
    rt => rt.token === hashedToken && rt.expiresAt > new Date()
  );

  if (tokenIndex === -1) {
    // Token not found or expired — possible token reuse attack
    // Invalidate all refresh tokens for security
    user.refreshTokens = [];
    await user.save();
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token. Please log in again.',
    });
  }

  // Token rotation: remove old token, issue new pair
  user.refreshTokens.splice(tokenIndex, 1);
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user);
  await saveRefreshToken(user, newRefreshToken);

  res.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});

// ── POST /api/auth/logout ──────────────────────────────────
const logoutUser = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
      );
      
      const user = await User.findById(decoded.userId);
      if (user) {
        const hashedToken = hashToken(refreshToken);
        user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== hashedToken);
        await user.save();
      }
    } catch {
      // Token invalid, ignore — user is logging out anyway
    }
  }

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// ── POST /api/auth/logout-all ──────────────────────────────
const logoutAllDevices = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  
  if (user) {
    user.refreshTokens = [];
    await user.save();
  }

  res.json({
    success: true,
    message: 'Logged out from all devices',
  });
});

// ── POST /api/auth/forgot-password ────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'No account found with that email address',
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token and save to database
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
  await user.save();

  // Send reset email
  await sendPasswordReset(user, resetToken);

  res.json({
    success: true,
    message: 'Password reset email sent. Please check your inbox.',
  });
});

// ── POST /api/auth/reset-password/:token ──────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash the token from URL to match database
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpire');

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token',
    });
  }

  // Update password and invalidate all sessions
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.refreshTokens = []; // Logout from all devices on password reset
  await user.save();

  const { accessToken, refreshToken } = generateTokens(user);
  await saveRefreshToken(user, refreshToken);

  res.json({
    success: true,
    message: 'Password reset successful',
    data: {
      accessToken,
      refreshToken,
      user: sanitiseUser(user),
    },
  });
});

// ── GET /api/auth/verify-email/:token ─────────────────────
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Hash the token from URL to match database
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpire');

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification link',
    });
  }

  // Mark email as verified
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  // Send welcome email now that they're verified
  sendWelcomeEmail(user).catch((err) => 
    console.error('Failed to send welcome email:', err)
  );

  res.json({
    success: true,
    message: 'Email verified successfully! Welcome to ShopEase.',
    data: { user: sanitiseUser(user) },
  });
});

// ── POST /api/auth/resend-verification ────────────────────
const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: 'Email is already verified',
    });
  }

  // Generate new verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  user.emailVerificationToken = hashedVerificationToken;
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save();

  // Send verification email
  await sendVerificationEmail(user, verificationToken);

  res.json({
    success: true,
    message: 'Verification email sent. Please check your inbox.',
  });
});

module.exports = { 
  register, 
  login, 
  refreshAccessToken, 
  logoutUser, 
  logoutAllDevices,
  forgotPassword, 
  resetPassword,
  verifyEmail,
  resendVerification,
};
