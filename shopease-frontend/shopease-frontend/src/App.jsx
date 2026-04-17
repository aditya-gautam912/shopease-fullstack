/**
 * src/App.jsx
 * Root application component. Defines all client-side routes,
 * protected route guards, and the persistent layout shell.
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn, selectIsAdmin } from './redux/slices/authSlice';

import { useEffect, useRef } from 'react';
import { useDispatch }      from 'react-redux';
import Navbar        from './components/layout/Navbar';
import Footer        from './components/layout/Footer';
import PageSpinner        from './components/common/PageSpinner';
import { cartService } from './services/index';
import { setCart, selectCartItems } from './redux/slices/cartSlice';
import { useSelector as useSel } from 'react-redux';
import { fetchCsrfToken } from './services/api';

// ── Lazy-loaded pages (code splitting) ────────────────────
const HomePage      = lazy(() => import('./pages/HomePage'));
const ProductsPage  = lazy(() => import('./pages/ProductsPage'));
const ProductDetail = lazy(() => import('./pages/ProductDetailPage'));
const CartPage      = lazy(() => import('./pages/CartPage'));
const CheckoutPage  = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage    = lazy(() => import('./pages/OrdersPage'));
const LoginPage     = lazy(() => import('./pages/LoginPage'));
const RegisterPage  = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ProfilePage   = lazy(() => import('./pages/ProfilePage'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
const WishlistPage  = lazy(() => import('./pages/WishlistPage'));
const AdminLayout   = lazy(() => import('./pages/admin/AdminLayout'));
const NotFoundPage  = lazy(() => import('./pages/NotFoundPage'));

// ── Route guards ───────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isAdmin    = useSelector(selectIsAdmin);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isAdmin)    return <Navigate to="/"      replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  return isLoggedIn ? <Navigate to="/" replace /> : children;
};

// ── InstallPrompt ─────────────────────────────────────────
// Catches the browser beforeinstallprompt event and shows a
// polished install banner at the bottom of the screen.
// Dismissed state is persisted so it never reappears after dismissal.
function InstallPrompt() {
  const [prompt,    setPrompt]    = React.useState(null);
  const [visible,   setVisible]   = React.useState(false);
  const [installed, setInstalled] = React.useState(false);

  useEffect(() => {
    // Do not show if already dismissed or installed
    if (localStorage.getItem('pwa-dismissed')) return;

    const handler = (e) => {
      e.preventDefault();          // stop Chrome mini-bar
      setPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setVisible(false);
      setInstalled(true);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('pwa-dismissed', '1');
  };

  if (!visible || installed) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0 shadow-md">
          S
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Install ShopEase</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Add to home screen for the best experience</p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-semibold px-2 py-1 transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-full transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CartSync ───────────────────────────────────────────────
// Invisible component that keeps the server cart in sync.
//  - On login: fetch server cart and replace local cart for the signed-in user
//  - On change: debounced push to server (500ms)
//  - On logout: cart is cleared by authSlice already
function CartSync() {
  const dispatch   = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const items      = useSel(selectCartItems);
  const prevToken  = useRef(null);
  const syncTimer  = useRef(null);
  const hydratingCart = useRef(false);

  // On login — replace the local cart with the signed-in user's server cart.
  // Do not merge here; otherwise an admin/user can inherit another user's local cart.
  useEffect(() => {
    const wasLoggedOut = !prevToken.current;
    const nowLoggedIn  = isLoggedIn;
    prevToken.current  = isLoggedIn;

    if (!nowLoggedIn || !wasLoggedOut) return;

    (async () => {
      hydratingCart.current = true;
      try {
        const serverItems = await cartService.getCart();
        dispatch(setCart(serverItems));
      } catch {
        // Silently ignore — cart sync failure should never break the app
      } finally {
        hydratingCart.current = false;
      }
    })();
  }, [isLoggedIn, dispatch]);

  // On every cart change (when logged in) — debounced sync to server
  useEffect(() => {
    if (!isLoggedIn) return;
    if (hydratingCart.current) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      cartService.syncCart(items).catch(() => {});
    }, 600);
    return () => clearTimeout(syncTimer.current);
  }, [items, isLoggedIn]);

  return null;
}

// ── App ────────────────────────────────────────────────────
export default function App() {
  // Fetch CSRF token on app load
  useEffect(() => {
    fetchCsrfToken();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Navbar />
      <CartSync />
      <InstallPrompt />

      <main className="flex-1">
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* Public */}
            <Route path="/"            element={<HomePage />} />
            <Route path="/products"    element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart"        element={<CartPage />} />
            <Route path="/checkout"    element={<CheckoutPage />} />
            <Route path="/track-order/:token" element={<TrackOrderPage />} />
            <Route path="/wishlist"    element={<WishlistPage />} />

            {/* Guest only */}
            <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
            <Route path="/reset-password/:token" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
            <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

            {/* Auth required */}
            <Route path="/orders"   element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/profile"  element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin/*"  element={<AdminRoute><AdminLayout /></AdminRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
