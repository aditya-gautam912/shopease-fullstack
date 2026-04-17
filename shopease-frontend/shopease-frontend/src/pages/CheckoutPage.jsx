/**
 * src/pages/CheckoutPage.jsx
 * Multi-step checkout: Shipping Address → Payment → Confirmation.
 *
 * Payment methods (India-friendly via Razorpay):
 *   UPI        — Google Pay, PhonePe, Paytm, BHIM and any UPI app
 *   Cards      — Visa, Mastercard, RuPay, Amex
 *   NetBanking — All major Indian banks
 *   Wallets    — Paytm, Amazon Pay, Mobikwik, etc.
 *   COD        — Cash on Delivery (no gateway needed)
 *
 * Razorpay JS SDK is loaded from their CDN on demand.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector }  from 'react-redux';
import { useForm }                   from 'react-hook-form';
import { motion }                    from 'framer-motion';
import toast                         from 'react-hot-toast';

import { selectCartItems, clearCart } from '../redux/slices/cartSlice';
import { selectCurrentUser }          from '../redux/slices/authSlice';
import { orderService }               from '../services/index';
import { fmtPrice }                   from '../utils/helpers';

const RZP_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

// ── Load Razorpay checkout.js from CDN on demand ──────────
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script    = document.createElement('script');
    script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload   = () => resolve(true);
    script.onerror  = () => resolve(false);
    document.body.appendChild(script);
  });

// ── Step bar ───────────────────────────────────────────────
const STEPS = ['Shipping', 'Payment', 'Done'];
function StepBar({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-10 px-2">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
              step > i + 1 ? 'bg-green-500 text-white' :
              step === i + 1 ? 'bg-primary-500 text-white' :
              'bg-gray-200 dark:bg-gray-700 text-gray-400'
            }`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] sm:text-sm font-semibold ${
              step === i + 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400'
            }`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 min-w-[20px] sm:min-w-[40px] ${step > i + 1 ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Payment method options ─────────────────────────────────
const PAYMENT_METHODS = [
  {
    id:   'upi',
    label: 'UPI',
    sub:   'Google Pay, PhonePe, Paytm, BHIM & all UPI apps',
    icon:  '📱',
    badge: 'Most Popular',
  },
  {
    id:   'card',
    label: 'Credit / Debit Card',
    sub:   'Visa, Mastercard, RuPay, Amex',
    icon:  '💳',
  },
  {
    id:   'netbanking',
    label: 'Net Banking',
    sub:   'All major Indian banks supported',
    icon:  '🏦',
  },
  {
    id:   'wallet',
    label: 'Wallets',
    sub:   'Paytm, Amazon Pay, Mobikwik & more',
    icon:  '👛',
  },
  {
    id:   'cod',
    label: 'Cash on Delivery',
    sub:   'Pay when your order arrives',
    icon:  '💵',
  },
];

// ── Order summary box ──────────────────────────────────────
function OrderSummary({ items, discount, shipping, total }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-1">
        <span>Subtotal</span>
        <span>{fmtPrice(items.reduce((s, i) => s + i.price * i.qty, 0))}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-xs sm:text-sm text-green-600 mb-1">
          <span>Discount</span><span>-{fmtPrice(discount)}</span>
        </div>
      )}
      <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2">
        <span>Shipping</span>
        <span>{shipping === 0 ? <span className="text-green-600 font-semibold">Free</span> : fmtPrice(shipping)}</span>
      </div>
      <div className="flex justify-between font-extrabold text-sm sm:text-base text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
        <span>Total</span><span>{fmtPrice(total)}</span>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function CheckoutPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useSelector(selectCurrentUser);
  const items     = useSelector(selectCartItems) || [];

  const checkoutState = location.state || {};
  const { discount = 0, shipping = 849, total = 0, coupon = null } = checkoutState;

  const [step,      setStep]      = useState(1);
  const [payMethod, setPayMethod] = useState('upi');
  const [placing,   setPlacing]   = useState(false);
  const [orderDone, setOrderDone] = useState(null);
  const [savedAddr, setSavedAddr] = useState(null);
  const [isGuest,   setIsGuest]   = useState(!user);
  const [guestInfo, setGuestInfo] = useState({ email: '', name: '', phone: '' });
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    mode: 'onSubmit', reValidateMode: 'onChange',
  });

  const defaultAddress = user?.addresses?.find((address) => address.isDefault);

  const fillDefaultAddress = () => {
    if (!defaultAddress) return;

    setUseDefaultAddress(true);
    setValue('street', defaultAddress.street || '', { shouldValidate: true, shouldDirty: true });
    setValue('city', defaultAddress.city || '', { shouldValidate: true, shouldDirty: true });
    setValue('state', defaultAddress.state || '', { shouldValidate: true, shouldDirty: true });
    setValue('zip', defaultAddress.zip || '', { shouldValidate: true, shouldDirty: true });
  };

  const onAddressSubmit = (data) => {
    setSavedAddr({
      street: data.street || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      country: data.country || defaultAddress?.country || 'US',
    });
    setStep(2);
  };

  // ── COD — place order directly, no gateway ────────────────
  const placeCOD = async () => {
    setPlacing(true);
    try {
      if (isGuest) {
        const result = await orderService.createGuestOrder({
          items:           items.map((i) => ({ productId: i._id, qty: i.qty })),
          shippingAddress: savedAddr,
          paymentMethod:   'cod',
          coupon,
          discount,
          guestEmail:      guestInfo.email,
          guestName:       guestInfo.name,
          guestPhone:      guestInfo.phone,
        });
        dispatch(clearCart());
        setOrderDone({ ...result.data, trackingToken: result.trackingToken });
        setStep(3);
      } else {
        const order = await orderService.createOrder({
          items:           items.map((i) => ({ productId: i._id, qty: i.qty })),
          shippingAddress: savedAddr,
          paymentMethod:   'cod',
          coupon,
          discount,
        });
        dispatch(clearCart());
        setOrderDone(order);
        setStep(3);
      }
    } catch (err) {
      toast.error(err.message || 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  // ── Razorpay — open popup then confirm order ──────────────
  const placeRazorpay = async () => {
    const keyId = RZP_KEY || '';
    if (!keyId) {
      toast.error('Razorpay is not configured. Add VITE_RAZORPAY_KEY_ID to your .env file.');
      return;
    }

    setPlacing(true);
    try {
      // 1. Load Razorpay SDK
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Could not load Razorpay. Check your internet connection.');
        setPlacing(false);
        return;
      }

      // 2. Create Razorpay order on backend
      const rzpData = await orderService.createRazorpayOrder({
        items:    items.map((i) => ({ productId: i._id, qty: i.qty })),
        discount,
      });

      // 3. Open Razorpay checkout popup
      await new Promise((resolve, reject) => {
        const options = {
          key:         rzpData.keyId || keyId,
          amount:      rzpData.amountPaise,
          currency:    rzpData.currency || 'INR',
          name:        'ShopEase',
          description: `Order — ${items.length} item${items.length > 1 ? 's' : ''}`,
          order_id:    rzpData.razorpayOrderId,
          prefill: {
            name:  user?.name  || '',
            email: user?.email || '',
          },
          theme:   { color: '#6c63ff' },
          method:  payMethod !== 'cod' ? { [payMethod]: true } : undefined,

          handler: async (response) => {
            // 4. Payment successful — confirm order on backend
            try {
              if (isGuest) {
                const result = await orderService.createGuestOrder({
                  items:             items.map((i) => ({ productId: i._id, qty: i.qty })),
                  shippingAddress:   savedAddr,
                  paymentMethod:     payMethod,
                  coupon,
                  discount,
                  guestEmail:        guestInfo.email,
                  guestName:         guestInfo.name,
                  guestPhone:        guestInfo.phone,
                  razorpayOrderId:   response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                dispatch(clearCart());
                setOrderDone({ ...result.data, trackingToken: result.trackingToken });
                setStep(3);
              } else {
                const order = await orderService.createOrder({
                  items:             items.map((i) => ({ productId: i._id, qty: i.qty })),
                  shippingAddress:   savedAddr,
                  paymentMethod:     payMethod,
                  coupon,
                  discount,
                  razorpayOrderId:   response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                dispatch(clearCart());
                setOrderDone(order);
                setStep(3);
              }
              resolve();
            } catch (err) {
              toast.error(err.message || 'Order confirmation failed');
              reject(err);
            } finally {
              setPlacing(false);
            }
          },

          modal: {
            ondismiss: () => {
              setPlacing(false);
              resolve(); // user closed popup — don't treat as error
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
          toast.error(response.error?.description || 'Payment failed');
          setPlacing(false);
          resolve();
        });
        rzp.open();
      });
    } catch (err) {
      toast.error(err.message || 'Payment failed');
      setPlacing(false);
    }
  };

  const handlePlaceOrder = () => {
    if (payMethod === 'cod') return placeCOD();
    return placeRazorpay();
  };

  // ── Confirmation screen ───────────────────────────────────
  if (step === 3 && orderDone) return (
    <div className="min-h-[60vh] sm:min-h-[70vh] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center w-full max-w-md"
      >
        <div className="text-5xl sm:text-7xl mb-4 sm:mb-5">🎉</div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-2 sm:mb-3">Order Placed!</h1>
        <p className="text-sm sm:text-base text-gray-500 mb-2">
          {payMethod === 'cod'
            ? 'Your order is confirmed. Pay on delivery.'
            : 'Payment successful. Your order is being processed.'}
        </p>
        <div className="card p-3 sm:p-4 mb-4 sm:mb-6 text-left">
          <p className="text-[10px] sm:text-xs text-gray-400 mb-1">Order ID</p>
          <p className="font-mono text-xs sm:text-sm font-bold text-primary-500 break-all">{orderDone._id}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-3 mb-1">Total Paid</p>
          <p className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">{fmtPrice(orderDone.total)}</p>
          {isGuest && orderDone.trackingToken && (
            <>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-3 mb-1">Track Your Order</p>
              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300">
                Confirmation email sent to <span className="font-bold break-all">{guestInfo.email}</span>
              </p>
            </>
          )}
        </div>
        {isGuest ? (
          <div className="space-y-3">
            {orderDone.trackingToken && (
              <button 
                onClick={() => navigate(`/track-order/${orderDone.trackingToken}`)} 
                className="btn-primary w-full py-3 justify-center"
              >
                Track My Order
              </button>
            )}
            <button onClick={() => navigate('/')} className="btn-outline w-full py-3 justify-center">
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button onClick={() => navigate('/orders')} className="btn-primary w-full py-3 justify-center">
              View My Orders
            </button>
            <button onClick={() => navigate('/')} className="btn-outline w-full py-3 justify-center">
              Continue Shopping
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <StepBar step={step} />

      {/* ── Guest / Auth Toggle (only show on step 1 if no user) ── */}
      {step === 1 && !user && (
        <div className="card p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 xs:gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {isGuest ? 'Checking out as guest' : 'Have an account?'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isGuest 
                  ? 'Sign in to save this order' 
                  : 'Sign in for saved addresses'}
              </p>
            </div>
            {isGuest ? (
              <button 
                onClick={() => navigate('/login', { state: { from: '/checkout' } })}
                className="btn-outline py-2 px-4 text-sm w-full xs:w-auto justify-center"
              >
                Sign In
              </button>
            ) : (
              <button 
                onClick={() => setIsGuest(true)}
                className="btn-outline py-2 px-4 text-sm w-full xs:w-auto justify-center"
              >
                Continue as Guest
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Step 1: Shipping Address + Guest Info ── */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="card p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 sm:mb-5">
            {isGuest ? 'Guest Checkout' : 'Shipping Address'}
          </h2>
          
          {/* Guest Information Form */}
          {isGuest && (
            <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Your Information</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    value={guestInfo.email}
                    onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                    className="form-input text-base"
                    required
                  />
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Order confirmation will be sent here</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                    className="form-input text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={guestInfo.phone}
                    onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                    className="form-input text-base"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {!isGuest && defaultAddress && (
            <button
              type="button"
              onClick={fillDefaultAddress}
              className={`block w-full text-left p-3 sm:p-4 mb-4 rounded-xl border-2 transition-all ${
                useDefaultAddress
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 w-4 h-4 rounded border flex-shrink-0 ${useDefaultAddress ? 'bg-primary-500 border-primary-500' : 'border-gray-400 dark:border-gray-500'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Use default address</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                    {defaultAddress.street}, {defaultAddress.city}
                    {defaultAddress.state ? `, ${defaultAddress.state}` : ''} - {defaultAddress.zip}
                  </p>
                </div>
              </div>
            </button>
          )}

          <form onSubmit={handleSubmit(onAddressSubmit)} noValidate className="space-y-3 sm:space-y-4">
            {[
              { name: 'street', label: 'Street / Area *',  placeholder: '123, MG Road, Koramangala', required: true  },
              { name: 'city',   label: 'City *',            placeholder: 'Bengaluru',                 required: true  },
              { name: 'state',  label: 'State',             placeholder: 'Karnataka',                 required: false },
              { name: 'zip',    label: 'PIN Code *',        placeholder: '560034',                    required: true  },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5">
                  {f.label}
                </label>
                <input
                  placeholder={f.placeholder}
                  className={`form-input text-base ${errors[f.name] ? 'error' : ''}`}
                  {...register(f.name, f.required ? { required: `${f.label.replace(' *', '')} is required` } : {})}
                />
                {errors[f.name] && (
                  <p className="text-red-500 text-[10px] sm:text-xs mt-1">{errors[f.name].message}</p>
                )}
              </div>
            ))}
            <input type="hidden" value={defaultAddress?.country || 'US'} {...register('country')} />
            <button 
              type="submit" 
              className="btn-primary w-full py-3 justify-center mt-2 touch-manipulation"
              disabled={isGuest && (!guestInfo.email || !guestInfo.name || !guestInfo.phone)}
            >
              Continue to Payment →
            </button>
          </form>
        </motion.div>
      )}

      {/* ── Step 2: Payment ── */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="card p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 sm:mb-5">Payment Method</h2>

          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            {PAYMENT_METHODS.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all touch-manipulation ${
                  payMethod === p.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio" name="pay" value={p.id}
                  checked={payMethod === p.id}
                  onChange={() => setPayMethod(p.id)}
                  className="accent-primary-500 flex-shrink-0 w-4 h-4"
                />
                <span className="text-xl sm:text-2xl flex-shrink-0">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">{p.label}</p>
                    {p.badge && (
                      <span className="text-[8px] sm:text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 line-clamp-1">{p.sub}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Razorpay trust badge */}
          {payMethod !== 'cod' && (
            <div className="flex items-center gap-2 mb-4 sm:mb-5 text-[10px] sm:text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5">
              <span>🔒</span>
              <span>Secure payments by <span className="font-bold text-gray-600 dark:text-gray-300">Razorpay</span></span>
            </div>
          )}

          <OrderSummary items={items} discount={discount} shipping={shipping} total={total} />

          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="btn-primary w-full py-3 justify-center touch-manipulation text-sm sm:text-base"
          >
            {placing
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {payMethod === 'cod' ? 'Placing…' : 'Opening…'}
                </span>
              : payMethod === 'cod'
                ? `Place Order · ${fmtPrice(total)}`
                : `Pay ${fmtPrice(total)} →`}
          </button>

          <button
            onClick={() => setStep(1)}
            className="w-full text-center text-xs sm:text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors touch-manipulation py-2"
          >
            ← Back to Address
          </button>

          {/* Test mode hint */}
          {RZP_KEY && RZP_KEY.includes('_test_') && payMethod !== 'cod' && (
            <div className="mt-4 p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg sm:rounded-xl border border-yellow-200 dark:border-yellow-800">
              <p className="text-[10px] sm:text-xs font-bold text-yellow-700 dark:text-yellow-400 mb-1">🧪 Test Mode</p>
              <p className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-500 leading-relaxed">
                UPI: <span className="font-mono">success@razorpay</span><br className="sm:hidden" />
                <span className="hidden sm:inline">&nbsp;|&nbsp;</span>
                Card: <span className="font-mono">4111...1111</span>
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
