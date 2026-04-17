/**
 * src/pages/RegisterPage.jsx
 * New user registration form. Validates on submit only.
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

// Field must be defined outside the component so it is never
// recreated on re-render — recreating it would unmount/remount
// the input and wipe whatever the user has typed.
function Field({ name, label, type = 'text', placeholder, rules, hint, register, errors }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className={`form-input ${errors[name] ? 'error' : ''}`}
        {...register(name, rules)}
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
      {hint && !errors[name] && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      const result = await authService.register({
        name:     data.name,
        email:    data.email,
        password: data.password,
      });
      dispatch(setCredentials(result));
      dispatch(clearCart());
      toast.success(`Welcome, ${result.user.name}! Account created.`);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-3">Create your account</h1>
            <p className="text-sm text-gray-500 mt-1">Join ShopEase today</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <Field name="name" label="Full Name" placeholder="John Doe"
              register={register} errors={errors}
              rules={{ required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } }} />

            <Field name="email" label="Email Address" type="email" placeholder="you@example.com"
              register={register} errors={errors}
              rules={{
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Please enter a valid email' },
              }} />

            <Field name="password" label="Password" type="password" placeholder="••••••••"
              hint="Minimum 6 characters"
              register={register} errors={errors}
              rules={{
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              }} />

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
              <input type="password" placeholder="••••••••"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (v) => v === password || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 justify-center">
              {isSubmitting
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating account…</span>
                : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-500 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
