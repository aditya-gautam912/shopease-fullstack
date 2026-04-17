/**
 * src/pages/LoginPage.jsx
 * User login form using React Hook Form.
 * Validation fires on submit only; field errors clear on typing.
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { setCredentials } from '../redux/slices/authSlice';
import { clearCart }      from '../redux/slices/cartSlice';
import { authService }    from '../services/authService';

export default function LoginPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    mode: 'onSubmit',        // validate on submit only
    reValidateMode: 'onChange', // clear error as user types
  });

  const onSubmit = async (data) => {
    try {
      const result = await authService.login(data);
      dispatch(setCredentials(result));
      dispatch(clearCart());
      toast.success(`Welcome back, ${result.user.name}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="card p-8">
          <div className="text-center mb-8">
            <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
              ShopEase
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-3">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className={`form-input ${errors.email ? 'error' : ''}`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Please enter a valid email' },
                })}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-primary-500 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className={`form-input ${errors.password ? 'error' : ''}`}
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 justify-center">
              {isSubmitting
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in…</span>
                : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-500 font-semibold hover:underline">Sign up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
