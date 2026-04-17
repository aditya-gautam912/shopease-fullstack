/**
 * src/components/layout/Navbar.jsx
 * Sticky top navigation bar with search, cart badge, auth links,
 * dark-mode toggle, and a slide-in mobile drawer.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';

import { logout, selectCurrentUser, selectIsLoggedIn, selectIsAdmin, selectRefreshToken } from '../../redux/slices/authSlice';
import { clearCart, selectCartCount } from '../../redux/slices/cartSlice';
import { toggleDarkMode, selectDarkMode, setMobileMenu, selectMobileMenuOpen } from '../../redux/slices/uiSlice';
import { fetchWishlist, selectWishlistCount } from '../../redux/slices/wishlistSlice';
import { useDebounce, useClickOutside } from '../../hooks';
import { productService } from '../../services/productService';
import { authService } from '../../services/authService';
import { getInitials, truncate } from '../../utils/helpers';

export default function Navbar() {
  const dispatch      = useDispatch();
  const navigate      = useNavigate();
  const location      = useLocation();
  const user          = useSelector(selectCurrentUser);
  const isLoggedIn    = useSelector(selectIsLoggedIn);
  const isAdmin       = useSelector(selectIsAdmin);
  const refreshToken  = useSelector(selectRefreshToken);
  const cartCount     = useSelector(selectCartCount);
  const wishlistCount = useSelector(selectWishlistCount);
  const darkMode      = useSelector(selectDarkMode);
  const mobileOpen    = useSelector(selectMobileMenuOpen);

  const [search,        setSearch]        = useState('');
  const [suggestions,   setSuggestions]   = useState([]);
  const [showSug,       setShowSug]       = useState(false);
  const [loadingSug,    setLoadingSug]    = useState(false);
  const [userMenuOpen,  setUserMenuOpen]  = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const searchRef       = useRef(null);
  const userMenuRef     = useRef(null);

  useClickOutside(searchRef,  () => setShowSug(false));
  useClickOutside(userMenuRef, () => setUserMenuOpen(false));

  // Close mobile menu on route change
  useEffect(() => { dispatch(setMobileMenu(false)); }, [location.pathname, dispatch]);

  // Fetch wishlist on login
  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchWishlist());
    }
  }, [isLoggedIn, dispatch]);

  // Fetch search suggestions
  useEffect(() => {
    if (!debouncedSearch.trim()) { setSuggestions([]); setShowSug(false); return; }
    setLoadingSug(true);
    productService.getProducts({ search: debouncedSearch, limit: 6 })
      .then(({ products }) => { setSuggestions(products); setShowSug(true); })
      .catch(() => {})
      .finally(() => setLoadingSug(false));
  }, [debouncedSearch]);

  const handleSearchSelect = (product) => {
    setSearch(''); setShowSug(false);
    navigate(`/products/${product._id}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/products?search=${encodeURIComponent(search.trim())}`);
    setSearch(''); setShowSug(false);
  };

  const handleLogout = async () => {
    // Invalidate refresh token on server
    await authService.logout(refreshToken);
    dispatch(logout());
    dispatch(clearCart());
    navigate('/');
  };

  const navLinks = [
    { to: '/products', label: 'Shop' },
    { to: '/wishlist', label: 'Wishlist' },
    ...(isLoggedIn ? [{ to: '/orders', label: 'Orders' }] : []),
    ...(isAdmin     ? [{ to: '/admin', label: 'Admin' }]  : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 h-16">

            {/* Logo */}
            <Link to="/" className="flex-shrink-0 text-xl font-extrabold bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
              ShopEase
            </Link>

            {/* Search bar — hidden on mobile */}
            <form ref={searchRef} onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg hidden sm:block">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <SearchIcon />
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => suggestions.length && setShowSug(true)}
                  placeholder="Search products…"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-900 transition-all duration-200 dark:text-gray-100 placeholder-gray-400"
                />
                {loadingSug && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin inline-block" />
                  </span>
                )}
              </div>

              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSug && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden z-50"
                  >
                    {suggestions.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => handleSearchSelect(p)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <img src={p.image} alt={p.title}
                          className="w-10 h-10 object-cover rounded-lg bg-gray-100"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=60'; }} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{truncate(p.title, 40)}</p>
                          <p className="text-xs text-primary-500 font-bold">${p.price.toFixed(2)}</p>
                        </div>
                      </button>
                    ))}
                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 text-center text-sm text-primary-500 font-semibold border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      See all results for "{search}"
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    location.pathname.startsWith(l.to)
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >{l.label}</Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto md:ml-0">
              {/* Dark mode */}
              <button onClick={() => dispatch(toggleDarkMode())}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Toggle dark mode">
                {darkMode ? <SunIcon /> : <MoonIcon />}
              </button>

              {/* Wishlist */}
              <Link to="/wishlist" className="relative w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
                title="Wishlist">
                <HeartIcon />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">{wishlistCount}</span>
                )}
              </Link>

              {/* Cart */}
              <Link to="/cart" className="relative w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <CartIcon />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 badge text-[10px]">{cartCount}</span>
                )}
              </Link>

              {/* User menu */}
              {isLoggedIn ? (
                <div ref={userMenuRef} className="relative">
                  <button onClick={() => setUserMenuOpen((o) => !o)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition-colors">
                    {getInitials(user?.name)}
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{user?.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                        {[
                          { to: '/profile', label: 'My Profile' },
                          { to: '/orders',  label: 'My Orders' },
                          { to: '/wishlist',label: 'Wishlist' },
                          ...(isAdmin ? [{ to: '/admin', label: '🔐 Admin Panel' }] : []),
                        ].map((item) => (
                          <Link key={item.to} to={item.to} onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            {item.label}
                          </Link>
                        ))}
                        <button onClick={handleLogout}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-gray-800">
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link to="/login" className="hidden sm:inline-flex btn-primary text-sm py-2 px-4">
                  Sign In
                </Link>
              )}

              {/* Mobile hamburger */}
              <button onClick={() => dispatch(setMobileMenu(!mobileOpen))}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {mobileOpen ? <XIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => dispatch(setMobileMenu(false))}
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 h-full w-72 bg-white dark:bg-gray-900 z-50 shadow-2xl flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <span className="text-lg font-extrabold bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">ShopEase</span>
                <button onClick={() => dispatch(setMobileMenu(false))} className="p-1 text-gray-500"><XIcon /></button>
              </div>

              {/* Mobile search */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <form onSubmit={(e) => { e.preventDefault(); navigate(`/products?search=${encodeURIComponent(search)}`); dispatch(setMobileMenu(false)); setSearch(''); }}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></span>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
                      className="form-input pl-9 py-2" />
                  </div>
                </form>
              </div>

              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navLinks.map((l) => (
                  <Link key={l.to} to={l.to}
                    className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      location.pathname.startsWith(l.to)
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}>{l.label}</Link>
                ))}
              </nav>

              <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                {isLoggedIn ? (
                  <>
                    <p className="text-xs text-gray-500 px-2">Signed in as <strong>{user?.name}</strong></p>
                    <Link to="/profile" className="block px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">My Profile</Link>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl">Sign Out</button>
                  </>
                ) : (
                  <>
                    <Link to="/login"    className="block btn-primary text-center text-sm">Sign In</Link>
                    <Link to="/register" className="block btn-outline text-center text-sm mt-2">Create Account</Link>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── SVG Icons ──────────────────────────────────────────────
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const CartIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
const HeartIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const SunIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const MoonIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const MenuIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const XIcon      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
