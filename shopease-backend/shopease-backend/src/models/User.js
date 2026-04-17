/**
 * src/models/User.js
 * Mongoose schema and model for registered users.
 * Includes password hashing hook and a helper to compare passwords.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  street:    { type: String, required: true },
  city:      { type: String, required: true },
  state:     { type: String, default: '' },
  zip:       { type: String, required: true },
  country:   { type: String, default: 'US' },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // never returned in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  // Email verification fields
  isEmailVerified: { type: Boolean, default: true },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpire: { type: Date, select: false },
  addresses: {
    type: [addressSchema],
    default: [],
    validate: {
      validator: (arr) => arr.length <= 5,
      message: 'You can save a maximum of 5 addresses',
    },
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  cart: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title:     { type: String,  required: true },
    price:     { type: Number,  required: true },
    image:     { type: String,  required: true },
    category:  { type: String,  default: '' },
    stock:     { type: Number,  default: 99 },
    qty:       { type: Number,  required: true, min: 1 },
  }],
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  recentlyViewed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  active: { type: Boolean, default: true },
  // Refresh token storage for token rotation
  refreshTokens: [{
    token:     { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true, // adds createdAt & updatedAt
});

// ── Pre-save hook: hash password before saving ─────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare plain password with hash ──────
userSchema.methods.matchPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
