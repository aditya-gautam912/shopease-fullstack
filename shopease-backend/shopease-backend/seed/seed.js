/**
 * seed/seed.js
 * Populates the ShopEase database with sample data.
 *
 * Run with:  node seed/seed.js
 *
 * What it does:
 *  1. Connects to MongoDB using MONGO_URI from .env
 *  2. Drops existing users and products collections
 *  3. Creates 1 admin user
 *  4. Creates 70 products across all 5 categories
 *  5. Prints a summary and exits
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const dotenv   = require('dotenv');
const path     = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User    = require('../src/models/User');
const Product = require('../src/models/Product');
const Order   = require('../src/models/Order');
const Coupon  = require('../src/models/Coupon');

// ─────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────

const USERS = [
  {
    name:     'Admin User',
    email:    'admin@shopease.com',
    password: 'admin123',
    role:     'admin',
  },
];

const PRODUCTS = [

  // ════════════════════════════════════════════════════════
  // ELECTRONICS (16)
  // ════════════════════════════════════════════════════════
  {
    title: 'Premium Wireless Noise-Cancelling Headphones',
    description: 'Experience studio-quality sound with active noise cancellation. Features 30-hour battery life, premium leather ear cushions, and foldable design. Compatible with all Bluetooth devices.',
    price: 7559, oldPrice: 10919, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'],
    rating: { rate: 4.5, count: 320 }, stock: 85,
  },
  {
    title: 'Mechanical RGB Gaming Keyboard',
    description: 'Full-size TKL layout with Cherry MX Red switches, per-key RGB backlighting, aircraft-grade aluminium top plate, and detachable braided USB-C cable. N-key rollover for competitive gaming.',
    price: 13439, oldPrice: 16799, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80'],
    rating: { rate: 4.6, count: 280 }, stock: 62,
  },
  {
    title: '4K Mirrorless Camera with 18-55mm Lens',
    description: '24.2MP BSI-CMOS sensor with 4K 60fps video recording, 693-point phase-detect autofocus, 5-axis in-body image stabilisation, dual SD card slots, and weather-sealed magnesium alloy body.',
    price: 109199, oldPrice: 125999, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80'],
    rating: { rate: 4.8, count: 67 }, stock: 23,
  },
  {
    title: 'Smart Watch Series X — Health & Fitness',
    description: 'Continuous heart rate and SpO₂ monitoring, built-in GPS, ECG app, 50-metre water resistance, 14-day battery, and 100+ workout modes. Works with iOS and Android.',
    price: 20999, oldPrice: 27719, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'],
    rating: { rate: 4.5, count: 195 }, stock: 140,
  },
  {
    title: 'Portable Bluetooth Speaker — 360° Sound',
    description: '360-degree surround sound with deep bass radiator. IPX7 fully waterproof, 24-hour playtime, built-in microphone for calls, USB-C fast charging, and True Wireless Stereo pairing.',
    price: 6719, oldPrice: 8399, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80'],
    rating: { rate: 4.3, count: 380 }, stock: 200,
  },
  {
    title: 'Ultrawide 34" Curved Gaming Monitor',
    description: '34-inch 3440×1440 IPS panel, 165Hz refresh rate, 1ms response time, HDR400, AMD FreeSync Premium Pro, USB-C 65W charging, and a curved 1800R display for immersive gameplay.',
    price: 46199, oldPrice: 58799, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80'],
    rating: { rate: 4.7, count: 112 }, stock: 35,
  },
  {
    title: 'True Wireless Earbuds Pro — Active Noise Cancelling',
    description: 'Flagship-class TWS earbuds with hybrid active noise cancellation, 6-mic array for crystal-clear calls, 8-hour battery (32hr with case), IPX5 sweat resistance, and wireless charging case.',
    price: 12599, oldPrice: 16799, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80'],
    rating: { rate: 4.6, count: 530 }, stock: 180,
  },
  {
    title: 'Smart Home Security Camera — 4K Indoor/Outdoor',
    description: '4K Ultra HD with colour night vision, 160° wide-angle lens, AI-powered person/vehicle detection, two-way audio, local and cloud storage, and works with Alexa & Google Home.',
    price: 7559, oldPrice: 10079, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&q=80'],
    rating: { rate: 4.4, count: 247 }, stock: 120,
  },
  {
    title: 'Wireless Ergonomic Mouse — 4000 DPI',
    description: 'Silent-click ergonomic mouse with adjustable 800–4000 DPI, 6 programmable buttons, 2.4GHz + Bluetooth dual mode, 60-day battery life on a single AA, and rubber-grip side panels.',
    price: 4199, oldPrice: 5879, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80'],
    rating: { rate: 4.5, count: 412 }, stock: 250,
  },
  {
    title: '65W USB-C GaN Fast Charger — 3-Port',
    description: 'Compact GaN III technology charges a MacBook Pro, iPhone, and AirPods simultaneously. 65W USB-C PD + 18W USB-C + 12W USB-A. Foldable plug, universal voltage 100–240V.',
    price: 3779, oldPrice: 5039, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1647427060118-4911c9821b82?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1647427060118-4911c9821b82?w=600&q=80'],
    rating: { rate: 4.7, count: 890 }, stock: 600,
  },
  {
    title: 'Smart E-Reader — 7" Glare-Free Display',
    description: '7-inch 300 PPI e-ink display with adjustable warm/cool light, waterproof IPX8, 6-week battery, 16GB storage (thousands of books), and weeks-long battery on a single charge.',
    price: 11759, oldPrice: 14279, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80'],
    rating: { rate: 4.8, count: 1240 }, stock: 95,
  },
  {
    title: 'Portable 20000mAh Power Bank — 65W PD',
    description: '20000mAh high-capacity power bank with 65W USB-C Power Delivery, 22.5W fast charging, LCD battery display, simultaneous 3-device charging, and aircraft-grade aluminium shell.',
    price: 5039, oldPrice: 6719, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80'],
    rating: { rate: 4.5, count: 678 }, stock: 310,
  },
  {
    title: 'Gaming Headset 7.1 Surround Sound',
    description: 'Virtual 7.1 surround sound with 50mm drivers, noise-cancelling detachable microphone, memory foam ear cushions, RGB lighting, and compatibility with PC, PS5, Xbox, and Nintendo Switch.',
    price: 5879, oldPrice: 8399, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&q=80'],
    rating: { rate: 4.3, count: 365 }, stock: 145,
  },
  {
    title: 'Smart LED Strip Lights — 10m WiFi RGB',
    description: '10-metre RGB+W LED strip with 16 million colours, app control via iOS/Android, voice control with Alexa/Google, music sync mode, scene presets, and cuttable every 3 LEDs.',
    price: 2519, oldPrice: 3779, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1605106702842-01a887a31122?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1605106702842-01a887a31122?w=600&q=80'],
    rating: { rate: 4.4, count: 1520 }, stock: 800,
  },
  {
    title: 'Wireless Charging Pad — 15W Qi2',
    description: 'MagSafe-compatible 15W Qi2 wireless charging pad with LED indicator, foreign object detection, over-temperature protection, and ultra-slim 6mm profile. Charges through cases up to 5mm.',
    price: 2939, oldPrice: 4199, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1591370874773-6702e8f12fd8?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1591370874773-6702e8f12fd8?w=600&q=80'],
    rating: { rate: 4.6, count: 743 }, stock: 430,
  },
  {
    title: 'Mini Projector — 1080p Native WiFi Bluetooth',
    description: 'Native 1080p resolution, 9500 lux brightness, keystone correction, 200" max screen size, built-in stereo speakers, WiFi screen mirroring, Bluetooth audio out, and 50,000-hour LED lamp.',
    price: 25199, oldPrice: 31919, category: 'electronics',
    image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80'],
    rating: { rate: 4.4, count: 198 }, stock: 55,
  },

  // ════════════════════════════════════════════════════════
  // FASHION (14)
  // ════════════════════════════════════════════════════════
  {
    title: 'Premium Running Sneakers Pro',
    description: 'Lightweight EVA foam midsole with responsive Boost cushioning, breathable engineered knit upper, rubber outsole with multi-directional grip pattern. Available in sizes 6–13.',
    price: 10079, oldPrice: 13439, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80'],
    rating: { rate: 4.4, count: 450 }, stock: 300,
  },
  {
    title: 'Slim Laptop Travel Backpack 30L',
    description: 'Water-resistant 900D polyester shell with a padded laptop compartment (fits up to 17"), dedicated tablet sleeve, hidden anti-theft pocket, external USB charging port, and TSA-approved pass-through strap.',
    price: 4199, oldPrice: 5879, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80'],
    rating: { rate: 4.3, count: 210 }, stock: 175,
  },
  {
    title: 'Minimalist Full-Grain Leather Wallet',
    description: 'Hand-stitched vegetable-tanned full-grain leather. Slim profile with RFID-blocking lining, 6 card slots, 2 hidden cash pockets. Develops a beautiful patina with age.',
    price: 3359, oldPrice: 5039, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80'],
    rating: { rate: 4.4, count: 265 }, stock: 500,
  },
  {
    title: 'Relaxed Linen Blazer — Modern Fit',
    description: 'Premium linen-cotton blend (55% linen, 45% cotton) blazer with notch lapels, two-button closure, double-vent back, and a half-canvas construction for shape retention. Dry-clean recommended.',
    price: 7559, oldPrice: 10919, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&q=80'],
    rating: { rate: 4.2, count: 120 }, stock: 88,
  },
  {
    title: 'Classic Aviator Sunglasses — Polarised UV400',
    description: 'Timeless aviator frame in brushed gold stainless steel with gradient polarised lenses. 100% UVA/UVB protection, spring hinges, includes microfibre pouch and hard case.',
    price: 2939, oldPrice: 4619, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80'],
    rating: { rate: 4.5, count: 632 }, stock: 340,
  },
  {
    title: 'Merino Wool Crew-Neck Sweater',
    description: '100% extra-fine 17.5-micron merino wool. Naturally temperature-regulating, moisture-wicking, and odour-resistant. Ribbed cuffs and hem, reinforced shoulder seams. Machine washable.',
    price: 6299, oldPrice: 8399, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80'],
    rating: { rate: 4.6, count: 287 }, stock: 145,
  },
  {
    title: 'Slim-Fit Chino Trousers',
    description: 'Stretch cotton-elastane blend (97% cotton, 3% elastane) chinos with slim tapered leg, 4-pocket construction, and a flat-front waistband. Wrinkle-resistant finish. Available in 6 colours.',
    price: 4619, oldPrice: 6299, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80'],
    rating: { rate: 4.3, count: 394 }, stock: 280,
  },
  {
    title: 'Genuine Leather Crossbody Bag',
    description: 'Full-grain cowhide leather crossbody with adjustable 120cm strap, brass YKK zipper, interior zip pocket, card slots, and a structured base. Fits a 10-inch tablet. Available in tan and black.',
    price: 7139, oldPrice: 10079, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80'],
    rating: { rate: 4.5, count: 178 }, stock: 95,
  },
  {
    title: 'Classic White Oxford Button-Down Shirt',
    description: 'Tailored-fit 100% poplin cotton Oxford shirt with a semi-spread collar, single-button adjustable cuffs, and a back box pleat. Non-iron treatment keeps it crisp all day.',
    price: 3779, oldPrice: 5459, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80'],
    rating: { rate: 4.4, count: 523 }, stock: 420,
  },
  {
    title: 'Canvas High-Top Sneakers',
    description: 'Vulcanised natural rubber sole with premium 12oz canvas upper, metal eyelets, and OrthoLite insole for all-day cushioning. A timeless silhouette available in 12 colour combinations.',
    price: 5459, oldPrice: 7139, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600&q=80'],
    rating: { rate: 4.3, count: 861 }, stock: 560,
  },
  {
    title: 'Cashmere Beanie Hat',
    description: 'Luxury 100% Grade-A Mongolian cashmere ribbed beanie. Incredibly soft, lightweight, and warm. One-size-fits-most with just enough stretch. Hand wash cold, dry flat.',
    price: 3359, oldPrice: 5039, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&q=80'],
    rating: { rate: 4.7, count: 312 }, stock: 230,
  },
  {
    title: 'Minimalist Stainless Steel Watch',
    description: '40mm brushed 316L stainless steel case, sapphire crystal glass, Swiss quartz movement, 5ATM water resistance, mesh bracelet with micro-adjust clasp. No. of parts: 89.',
    price: 10919, oldPrice: 15119, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&q=80'],
    rating: { rate: 4.6, count: 445 }, stock: 110,
  },
  {
    title: 'Slim Leather Belt — Reversible',
    description: 'Reversible 100% full-grain cowhide belt (black/tan) with a solid brass buckle and a 1.25-inch width. Sizes 30–44 inches. A single belt that works with any outfit.',
    price: 2519, oldPrice: 3779, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&q=80'],
    rating: { rate: 4.4, count: 289 }, stock: 380,
  },
  {
    title: 'Oversized Teddy Fleece Hoodie',
    description: 'Ultra-soft recycled polyester teddy fleece in a relaxed oversized silhouette. Kangaroo pocket, adjustable drawstring hood, ribbed cuffs, and a brushed inner lining. Sustainable fabric.',
    price: 5039, oldPrice: 6719, category: 'fashion',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80'],
    rating: { rate: 4.5, count: 714 }, stock: 290,
  },

  // ════════════════════════════════════════════════════════
  // HOME (14)
  // ════════════════════════════════════════════════════════
  {
    title: 'Smart LED Desk Lamp with Wireless Charging',
    description: 'Touch-dimmable LED lamp with 5 colour temperature modes (2700K–6500K), 10W Qi wireless charging base, built-in USB-A port, eye-care flicker-free technology, and memory function.',
    price: 2939, oldPrice: 4199, category: 'home',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80'],
    rating: { rate: 4.6, count: 180 }, stock: 220,
  },
  {
    title: 'Ergonomic Mesh Office Chair',
    description: 'Breathable 3D mesh back with adjustable lumbar support, 4D armrests, seat depth adjustment, tilt lock mechanism, and a heavy-duty aluminium base with smooth-rolling PU castors. Weight limit 150 kg.',
    price: 25199, oldPrice: 33599, category: 'home',
    image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&q=80'],
    rating: { rate: 4.7, count: 95 }, stock: 40,
  },
  {
    title: 'Handcrafted Ceramic Mug Set of 4',
    description: 'Set of four 14-oz hand-thrown ceramic mugs with a speckled matte glaze in warm earth tones. Microwave and dishwasher safe. Each mug is slightly unique — made by artisan potters.',
    price: 2435, oldPrice: 3359, category: 'home',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80'],
    rating: { rate: 4.5, count: 340 }, stock: 160,
  },
  {
    title: 'Hand-Poured Soy Candle Gift Set',
    description: 'Set of three 40-hour burn time soy wax candles with 100% cotton wicks. Fragrances: French Lavender, Warm Vanilla, and Cedarwood Sandalwood. Poured in reusable amber glass jars.',
    price: 2939, oldPrice: 3779, category: 'home',
    image: 'https://images.unsplash.com/photo-1602178961717-db50dd30acea?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1602178961717-db50dd30acea?w=600&q=80'],
    rating: { rate: 4.8, count: 156 }, stock: 320,
  },
  {
    title: 'Cast Iron Dutch Oven — 5.5 Quart',
    description: 'Enamelled cast iron Dutch oven with self-basting condensation drips lid, even heat distribution, and a porcelain enamel interior that resists staining. Oven-safe to 260°C. Works on all hobs including induction.',
    price: 7559, oldPrice: 10919, category: 'home',
    image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80'],
    rating: { rate: 4.9, count: 2140 }, stock: 65,
  },
  {
    title: 'French Press Coffee Maker — 34oz Borosilicate',
    description: 'Borosilicate glass carafe with 4-layer stainless steel mesh filter, thermal-grip handle, and a non-slip base. Makes 8 cups of rich, full-bodied coffee in 4 minutes. Dishwasher safe.',
    price: 2771, oldPrice: 3779, category: 'home',
    image: 'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?w=600&q=80'],
    rating: { rate: 4.7, count: 1870 }, stock: 280,
  },
  {
    title: 'Bamboo Cutting Board Set — 3 Piece',
    description: 'Set of 3 organic bamboo cutting boards (small, medium, large) with juice grooves, grip feet, and hanging holes. Antibacterial natural fibres. Hand wash only. Includes conditioning oil.',
    price: 3359, oldPrice: 4619, category: 'home',
    image: 'https://images.unsplash.com/photo-1596460107916-430662021049?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1596460107916-430662021049?w=600&q=80'],
    rating: { rate: 4.6, count: 924 }, stock: 340,
  },
  {
    title: 'Smart Digital Air Fryer — 5.8 Quart',
    description: '5.8-quart digital air fryer with 8 pre-set cooking functions, 60-minute timer, adjustable temperature 175–400°F, non-stick dishwasher-safe basket, and rapid hot-air circulation for 95% less oil.',
    price: 6719, oldPrice: 9239, category: 'home',
    image: 'https://images.unsplash.com/photo-1648753900085-b14e7f8c985b?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1648753900085-b14e7f8c985b?w=600&q=80'],
    rating: { rate: 4.6, count: 3420 }, stock: 95,
  },
  {
    title: 'Linen Duvet Cover Set — King Size',
    description: 'Stonewashed 100% French linen duvet cover with two pillowcases. Breathable, thermoregulating, and gets softer with every wash. Hidden button closure, corner ties, and a 200-thread-count weave.',
    price: 10079, oldPrice: 14279, category: 'home',
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'],
    rating: { rate: 4.7, count: 543 }, stock: 85,
  },
  {
    title: 'Geometric Terracotta Plant Pot Set',
    description: 'Set of 3 hand-finished terracotta pots in gradient earth tones (4", 6", 8") with matching saucers. Drainage holes, unglazed interior for healthy roots, and a matte exterior with geometric embossing.',
    price: 2099, oldPrice: 2939, category: 'home',
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80'],
    rating: { rate: 4.8, count: 376 }, stock: 210,
  },
  {
    title: 'Non-Stick Ceramic Cookware Set — 10 Piece',
    description: '10-piece ceramic-coated aluminium cookware set including 8" and 10" frying pans, 1.5qt and 2.5qt saucepans with lids, 3qt sauté pan with lid, and 6qt stockpot with lid. PFOA and PTFE free.',
    price: 12599, oldPrice: 18479, category: 'home',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80'],
    rating: { rate: 4.5, count: 781 }, stock: 55,
  },
  {
    title: 'Himalayan Salt Lamp — Natural Crystal',
    description: 'Authentic hand-carved Himalayan pink salt lamp on a neem wood base with UL-listed dimmer switch and two 15W bulbs. Weight 4–5kg, illuminates approx. 10 square metres with warm amber glow.',
    price: 2351, oldPrice: 3359, category: 'home',
    image: 'https://images.unsplash.com/photo-1603204077779-bed963ea7d0e?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1603204077779-bed963ea7d0e?w=600&q=80'],
    rating: { rate: 4.6, count: 1890 }, stock: 175,
  },
  {
    title: 'Electric Spin Scrubber — Cordless 3-Speed',
    description: 'Cordless power scrubber with 3-speed settings up to 400 RPM, 4 interchangeable brush heads, waterproof IPX7 rating, 90-minute runtime on full charge, and an extendable 1.2m handle.',
    price: 3611, oldPrice: 5459, category: 'home',
    image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&q=80'],
    rating: { rate: 4.4, count: 2650 }, stock: 430,
  },
  {
    title: 'Woven Seagrass Storage Basket Set',
    description: 'Set of 3 handwoven natural seagrass baskets (S/M/L) with leather handles and removable cotton liners. Ideal for blankets, toys, laundry, or plants. Each basket is unique due to natural variation.',
    price: 4199, oldPrice: 5879, category: 'home',
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&q=80'],
    rating: { rate: 4.7, count: 428 }, stock: 140,
  },

  // ════════════════════════════════════════════════════════
  // SPORTS (13)
  // ════════════════════════════════════════════════════════
  {
    title: 'Professional Yoga Mat — 6mm Non-Slip',
    description: 'Double-layer natural rubber yoga mat with a microfibre top surface for superior grip when sweating. 6mm cushioning, alignment guide lines, carrying strap included. 183cm × 61cm.',
    price: 3863, oldPrice: 5459, category: 'sports',
    image: 'https://images.unsplash.com/photo-1601925228458-73735f69c57f?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1601925228458-73735f69c57f?w=600&q=80'],
    rating: { rate: 4.6, count: 310 }, stock: 420,
  },
  {
    title: 'Vacuum Insulated Water Bottle 32oz',
    description: 'Double-wall vacuum insulation keeps drinks cold for 24 hours or hot for 12 hours. BPA-free 18/8 stainless steel, leak-proof lid with carabiner loop, wide-mouth design fits ice cubes.',
    price: 2771, oldPrice: 3779, category: 'sports',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80'],
    rating: { rate: 4.5, count: 420 }, stock: 550,
  },
  {
    title: 'Adjustable Dumbbell Set 5–52.5 lbs',
    description: 'Single dumbbell replaces 15 sets of weights. Dial-select mechanism adjusts in 2.5 lb increments from 5 to 52.5 lbs. Moulded base included. Ideal for home gym workouts.',
    price: 29399, oldPrice: 36119, category: 'sports',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80'],
    rating: { rate: 4.7, count: 88 }, stock: 30,
  },
  {
    title: 'Resistance Bands Set — 5 Levels',
    description: 'Set of 5 latex resistance bands (10–50 lbs) with carrying bag, door anchor, foam handles, and ankle straps. Colour-coded by resistance level. Suitable for physical therapy, stretching, and strength training.',
    price: 2099, oldPrice: 2939, category: 'sports',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80'],
    rating: { rate: 4.6, count: 1870 }, stock: 620,
  },
  {
    title: 'Jump Rope — Speed Cable with Ball Bearings',
    description: 'Professional speed jump rope with 3mm steel cable, 360° precision ball bearings, memory foam ergonomic handles, and adjustable cable length (8–10ft). Tangle-free design for double-unders.',
    price: 1679, oldPrice: 2519, category: 'sports',
    image: 'https://images.unsplash.com/photo-1434596922112-19c563067271?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1434596922112-19c563067271?w=600&q=80'],
    rating: { rate: 4.5, count: 2140 }, stock: 750,
  },
  {
    title: 'Foam Roller — High-Density 18"',
    description: 'High-density EVA foam roller for myofascial release, deep tissue massage, and post-workout recovery. Firm grid pattern targets trigger points. 18 inches long, 6-inch diameter, supports up to 300 lbs.',
    price: 1931, oldPrice: 2939, category: 'sports',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80'],
    rating: { rate: 4.7, count: 3210 }, stock: 490,
  },
  {
    title: 'Gym Duffel Bag — 50L Waterproof',
    description: '50-litre waterproof duffel with separate ventilated shoe compartment, wet/dry separation, padded shoulder strap, multiple zip pockets, and reflective strips. Fits a full change of clothes plus gear.',
    price: 3779, oldPrice: 5459, category: 'sports',
    image: 'https://images.unsplash.com/photo-1622560480654-d96214fdc887?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1622560480654-d96214fdc887?w=600&q=80'],
    rating: { rate: 4.4, count: 568 }, stock: 210,
  },
  {
    title: 'Compression Running Tights — Men\'s',
    description: '78% nylon, 22% elastane 4-way stretch compression tights with flatlock seams, back zip pocket, reflective details, and graduated compression for reduced muscle fatigue on long runs.',
    price: 4199, oldPrice: 5879, category: 'sports',
    image: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=600&q=80'],
    rating: { rate: 4.4, count: 329 }, stock: 185,
  },
  {
    title: 'Pull-Up Bar — Doorframe No-Screw',
    description: 'Heavy-duty steel doorframe pull-up bar fits doors 60–100cm wide with no screws or permanent installation. Supports up to 150kg, foam-padded grips, multiple grip positions for pull-ups, chin-ups, and dips.',
    price: 2939, oldPrice: 4199, category: 'sports',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80'],
    rating: { rate: 4.5, count: 1240 }, stock: 320,
  },
  {
    title: 'Sport Running GPS Watch',
    description: 'GPS/GLONASS multi-sport watch with 40-hour GPS battery, barometric altimeter, heart rate, SpO₂, VO₂max, training load, recovery advisor, and 5ATM water resistance. Pair to iOS and Android.',
    price: 16799, oldPrice: 20999, category: 'sports',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&q=80'],
    rating: { rate: 4.6, count: 412 }, stock: 75,
  },
  {
    title: 'Knee Sleeves — 7mm Neoprene (Pair)',
    description: 'Pair of 7mm neoprene knee sleeves for powerlifting and CrossFit. Graduated compression improves proprioception and reduces injury risk. IPF-approved dimensions. Sizes XS–3XL.',
    price: 3359, oldPrice: 4619, category: 'sports',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80'],
    rating: { rate: 4.7, count: 987 }, stock: 260,
  },
  {
    title: 'Camping Hammock — Ultralight Nylon',
    description: 'Ultralight ripstop parachute nylon hammock (500 lbs capacity) weighing just 400g. Sets up in under 3 minutes with included carabiners and tree-friendly straps. Packs to fist size.',
    price: 3191, oldPrice: 4619, category: 'sports',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80'],
    rating: { rate: 4.8, count: 1560 }, stock: 390,
  },
  {
    title: 'Trekking Poles — Collapsible Aluminium (Pair)',
    description: 'Pair of collapsible 7075-series aluminium trekking poles with cork grips, wrist straps, carbide tips, and removable rubber feet. Folds to 38cm, adjusts 100–135cm. 470g per pair.',
    price: 4619, oldPrice: 6719, category: 'sports',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80'],
    rating: { rate: 4.6, count: 643 }, stock: 145,
  },

  // ════════════════════════════════════════════════════════
  // BEAUTY (13)
  // ════════════════════════════════════════════════════════
  {
    title: 'Vitamin C Brightening Serum 30ml',
    description: '15% L-Ascorbic Acid with Vitamin E and Ferulic Acid for maximum stability and efficacy. Reduces dark spots, evens skin tone, and boosts collagen production. Fragrance-free, dermatologist tested.',
    price: 2435, oldPrice: 3611, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80'],
    rating: { rate: 4.4, count: 520 }, stock: 280,
  },
  {
    title: 'Jade Roller & Gua Sha Facial Set',
    description: 'Authentic green jade dual-ended facial roller with stainless steel frame and a hand-carved gua sha scraping tool. Reduces puffiness, improves circulation, and helps serums absorb deeper.',
    price: 1595, oldPrice: 2519, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80'],
    rating: { rate: 4.3, count: 390 }, stock: 450,
  },
  {
    title: 'Professional Hair Dryer 1800W — Ionic',
    description: 'Ionic technology reduces frizz and static for ultra-smooth, shiny results. 1800W AC motor, 2 speeds, 3 heat settings, cool shot button, concentrator and diffuser attachments included.',
    price: 5459, oldPrice: 7559, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80'],
    rating: { rate: 4.5, count: 275 }, stock: 190,
  },
  {
    title: 'Hyaluronic Acid Moisturiser SPF 30 — 50ml',
    description: 'Lightweight daily moisturiser with 3 types of hyaluronic acid (low, medium, high molecular weight) plus SPF 30 broad-spectrum UVA/UVB protection. Non-comedogenic, suitable for all skin types.',
    price: 2099, oldPrice: 2939, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&q=80'],
    rating: { rate: 4.6, count: 1870 }, stock: 340,
  },
  {
    title: 'Retinol Eye Cream — Anti-Ageing 15ml',
    description: '0.5% encapsulated retinol with peptides, caffeine, and niacinamide. Reduces fine lines, dark circles, and puffiness around the delicate eye area. Use nightly; results visible in 4 weeks.',
    price: 2771, oldPrice: 4199, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80'],
    rating: { rate: 4.5, count: 734 }, stock: 210,
  },
  {
    title: 'Micellar Cleansing Water — 400ml',
    description: 'Gentle soap-free micellar water that removes makeup, SPF, and impurities in one step. No rinsing needed. Formulated with glycerin and niacinamide, suitable for sensitive and reactive skin.',
    price: 1091, oldPrice: 1595, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=600&q=80'],
    rating: { rate: 4.7, count: 4320 }, stock: 560,
  },
  {
    title: 'Ceramic Hair Straightener — Tourmaline Plates',
    description: 'Tourmaline-ceramic floating plates with adjustable temperature 150–230°C, 30-second heat-up, auto shut-off after 60 minutes, ionic frizz control, and a 3m swivel cord. Works on all hair types.',
    price: 4199, oldPrice: 6299, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80'],
    rating: { rate: 4.4, count: 892 }, stock: 155,
  },
  {
    title: 'Natural Bristle Makeup Brush Set — 15 Piece',
    description: '15-piece professional makeup brush set with synthetic vegan bristles, rose-gold aluminium ferrules, and wooden handles. Includes foundation, contouring, blending, and detail brushes. Comes in a roll-up case.',
    price: 2939, oldPrice: 4619, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80'],
    rating: { rate: 4.5, count: 1240 }, stock: 290,
  },
  {
    title: 'Konjac Facial Sponge — 6 Pack',
    description: 'Pack of 6 100% natural konjac plant fibre facial sponges. Gentle exfoliation, deep pore cleansing, and natural pH balance without soap. Each lasts 1–2 months. Biodegradable and vegan.',
    price: 1259, oldPrice: 1931, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1614159850534-6c929e4e6327?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1614159850534-6c929e4e6327?w=600&q=80'],
    rating: { rate: 4.6, count: 2780 }, stock: 680,
  },
  {
    title: 'Rosehip Seed Face Oil — 30ml Organic',
    description: 'Cold-pressed certified organic Chilean rosehip oil, rich in trans-retinoic acid and essential fatty acids. Reduces scars, hyperpigmentation, and fine lines. Absorbs quickly, non-greasy finish.',
    price: 1679, oldPrice: 2519, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80'],
    rating: { rate: 4.7, count: 1560 }, stock: 380,
  },
  {
    title: 'Electric Facial Cleansing Brush — Sonic',
    description: 'Sonic vibration facial cleansing brush at 8,000 pulsations/minute with 3 intensity levels, 2 brush heads (silicone + bristle), waterproof IPX7, and USB magnetic charging. 7x deeper clean than hands.',
    price: 3359, oldPrice: 5459, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80'],
    rating: { rate: 4.4, count: 876 }, stock: 195,
  },
  {
    title: 'Sheet Mask Collection — 20 Pack Assorted',
    description: '20-pack assorted Korean sheet masks targeting: hydration, brightening, anti-ageing, pore minimising, and soothing. Each mask is soaked in 25ml of concentrated essence. Dermatologist and allergy tested.',
    price: 1931, oldPrice: 2771, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&q=80'],
    rating: { rate: 4.5, count: 2340 }, stock: 470,
  },
  {
    title: 'Teeth Whitening Kit — LED Accelerator',
    description: 'Professional-grade teeth whitening kit with 35% carbamide peroxide gel syringes, LED accelerator mouthpiece, and 2 custom-fit mouth trays. Results visible after first 20-minute session.',
    price: 2519, oldPrice: 3779, category: 'beauty',
    image: 'https://images.unsplash.com/photo-1588776814546-ec7e1a85a302?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1588776814546-ec7e1a85a302?w=600&q=80'],
    rating: { rate: 4.3, count: 1890 }, stock: 310,
  },
];

const COUPONS = [
  { code: 'SAVE10', type: 'percentage', discount: 0.10, description: '10% off your order', isActive: true },
  { code: 'SAVE20', type: 'percentage', discount: 0.20, description: '20% off your order', isActive: true },
  { code: 'SHOPEASE', type: 'percentage', discount: 0.15, description: '15% off — ShopEase special', isActive: true },
  { code: 'FLAT500', type: 'fixed', discount: 500, description: '₹500 off on orders above ₹2000', minOrderValue: 2000, isActive: true },
];

// ─────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n🔗  Connected to MongoDB');

    // ── Clear existing data ──────────────────────────────
    console.log('🗑   Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Coupon.deleteMany({}),
    ]);
    console.log('✅  Collections cleared');

    // ── Seed users (passwords hashed via pre-save hook) ──
    console.log('👤  Seeding users...');
    const createdUsers = await User.create(USERS);
    const adminUser    = createdUsers.find((u) => u.role === 'admin');
    console.log(`✅  Created ${createdUsers.length} user(s)`);

    // ── Seed products ────────────────────────────────────
    console.log('📦  Seeding products...');
    const createdProducts = await Product.create(PRODUCTS);
    console.log(`✅  Created ${createdProducts.length} products`);

    // ── Seed default coupons ────────────────────────────
    console.log('🎟️  Seeding coupons...');
    await Coupon.create(COUPONS);
    console.log('✅  Created 4 coupons');

    // ── Summary ──────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉  DATABASE SEEDED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋  Login Credentials:');
    console.log('  Admin  →  admin@shopease.com  /  admin123');
    console.log('\n📊  Seeded:');
    console.log(`  👤 ${createdUsers.length} user(s)`);
    console.log(`  📦 ${createdProducts.length} products (16 electronics · 14 fashion · 14 home · 13 sports · 13 beauty)`);
    console.log('\n🚀  You can now start the server: npm run dev\n');

  } catch (error) {
    console.error('\n❌  Seed failed:', error.message);
    if (error.errors) {
      Object.values(error.errors).forEach((e) => console.error('  →', e.message));
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌  Disconnected from MongoDB');
    process.exit(0);
  }
};

if (require.main === module) {
  seed();
}

module.exports = {
  COUPONS,
  PRODUCTS,
  USERS,
};
