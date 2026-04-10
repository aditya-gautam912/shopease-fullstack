/**
 * Safe production seed.
 *
 * This script does not delete users, orders, products, or coupons.
 * It only inserts sample products when the products collection is empty,
 * creates the admin user if missing, and upserts default coupons.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Coupon = require('../src/models/Coupon');
const { COUPONS, PRODUCTS, USERS } = require('./seed');

const seedSafe = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('\nConnected to MongoDB');

    const adminSeed = USERS.find((user) => user.role === 'admin');
    const existingAdmin = await User.findOne({ email: adminSeed.email });

    if (existingAdmin) {
      console.log('Admin user already exists; skipping admin creation');
    } else {
      await User.create(adminSeed);
      console.log('Created admin user');
    }

    const productCount = await Product.countDocuments();

    if (productCount > 0) {
      console.log(`Products already exist (${productCount}); skipping product seed`);
    } else {
      const createdProducts = await Product.create(PRODUCTS);
      console.log(`Created ${createdProducts.length} products`);
    }

    for (const coupon of COUPONS) {
      await Coupon.updateOne(
        { code: coupon.code },
        { $set: coupon },
        { upsert: true, runValidators: true },
      );
    }

    const finalProductCount = await Product.countDocuments();
    const couponCount = await Coupon.countDocuments({
      code: { $in: COUPONS.map((coupon) => coupon.code) },
    });

    console.log('\nSafe seed complete');
    console.log(`Products in database: ${finalProductCount}`);
    console.log(`Default coupons available: ${couponCount}`);
  } catch (error) {
    console.error('\nSafe seed failed:', error.message);
    if (error.errors) {
      Object.values(error.errors).forEach((e) => console.error('  ->', e.message));
    }
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedSafe();
