/**
 * src/pages/ProfilePage.jsx
 * User profile page - mobile optimized
 */
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { selectCurrentUser, updateUser } from '../redux/slices/authSlice';
import { userService } from '../services/index';
import { getInitials } from '../utils/helpers';
import { FiEye, FiEyeOff, FiLock, FiCheck, FiPlus, FiTrash2, FiMapPin, FiStar, FiX } from 'react-icons/fi';

const TABS = ['Profile', 'Addresses', 'Security'];

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user     = useSelector(selectCurrentUser);
  const [tab, setTab] = useState('Profile');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    mode: 'onSubmit', reValidateMode: 'onChange',
    defaultValues: { name: user?.name, email: user?.email },
  });

  const onSave = async (data) => {
    try {
      const updated = await userService.updateMe(data);
      dispatch(updateUser(updated));
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center gap-4 sm:gap-5 mb-6 sm:mb-8">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-lg sm:text-xl font-extrabold flex-shrink-0">
          {getInitials(user?.name)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white truncate">{user?.name}</h1>
            <span className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full" title="User verified">
              <FiCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
            </span>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm truncate">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {user?.role === 'admin' && (
              <span className="text-[10px] sm:text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold px-2 py-0.5 rounded-full">Admin</span>
            )}
            <span className="text-[10px] sm:text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold px-2 py-0.5 rounded-full">Verified</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6 sm:mb-8 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px touch-manipulation whitespace-nowrap ${tab === t ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <div className="card p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 sm:mb-5">Account Settings</h2>
          <form onSubmit={handleSubmit(onSave)} noValidate className="space-y-4 sm:space-y-5">
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5">Full Name</label>
                <input className={`form-input text-base ${errors.name ? 'error' : ''}`}
                  {...register('name', { required: 'Name is required' })} />
                {errors.name && <p className="text-red-500 text-[10px] sm:text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5">Email Address</label>
                <input type="email" className={`form-input text-base ${errors.email ? 'error' : ''}`}
                  {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
                {errors.email && <p className="text-red-500 text-[10px] sm:text-xs mt-1">{errors.email.message}</p>}
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary py-2.5 px-6 text-sm sm:text-base touch-manipulation">
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {tab === 'Addresses' && <AddressManager />}

      {tab === 'Security' && <PasswordChangeForm />}
    </div>
  );
}

// ── Address Manager Component ─────────────────────────────
function AddressManager() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const [addresses, setAddresses] = useState(user?.addresses || []);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onBlur' });

  // Sync addresses from user state
  useEffect(() => {
    if (user?.addresses) {
      setAddresses(user.addresses);
    }
  }, [user?.addresses]);

  const onAddAddress = async (data) => {
    try {
      const updated = await userService.addAddress(data);
      setAddresses(updated);
      dispatch(updateUser({ ...user, addresses: updated }));
      toast.success('Address added!');
      reset();
      setShowForm(false);
    } catch (err) {
      toast.error(err.message || 'Failed to add address');
    }
  };

  const onDeleteAddress = async (addressId) => {
    setDeleting(addressId);
    try {
      const updated = await userService.removeAddress(addressId);
      setAddresses(updated);
      dispatch(updateUser({ ...user, addresses: updated }));
      toast.success('Address removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove address');
    } finally {
      setDeleting(null);
    }
  };

  const onSetDefault = async (addressId) => {
    const address = addresses.find((a) => a._id === addressId);
    if (!address || address.isDefault) return;

    try {
      const updated = await userService.setDefaultAddress(addressId);
      setAddresses(updated);
      dispatch(updateUser({ ...user, addresses: updated }));
      toast.success('Default address updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update default address');
    }
  };

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center gap-2">
          <FiMapPin className="w-5 h-5 text-primary-500" />
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Delivery Addresses</h2>
        </div>
        {addresses.length < 5 && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary py-2 px-3 sm:px-4 text-xs sm:text-sm flex items-center gap-1.5"
          >
            <FiPlus size={16} />
            <span className="hidden sm:inline">Add Address</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-5">
        Manage your delivery addresses (max 5). Set a default for faster checkout.
      </p>

      {/* Add Address Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Add New Address</h3>
            <button
              onClick={() => { setShowForm(false); reset(); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FiX size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit(onAddAddress)} noValidate className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Street Address *
              </label>
              <input
                className={`form-input text-base ${errors.street ? 'error' : ''}`}
                placeholder="123 Main Street, Apt 4B"
                {...register('street', { required: 'Street address is required' })}
              />
              {errors.street && <p className="text-red-500 text-[10px] sm:text-xs mt-1">{errors.street.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  City *
                </label>
                <input
                  className={`form-input text-base ${errors.city ? 'error' : ''}`}
                  placeholder="New York"
                  {...register('city', { required: 'City is required' })}
                />
                {errors.city && <p className="text-red-500 text-[10px] sm:text-xs mt-1">{errors.city.message}</p>}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  State
                </label>
                <input
                  className="form-input text-base"
                  placeholder="NY"
                  {...register('state')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  ZIP Code *
                </label>
                <input
                  className={`form-input text-base ${errors.zip ? 'error' : ''}`}
                  placeholder="10001"
                  {...register('zip', { required: 'ZIP code is required' })}
                />
                {errors.zip && <p className="text-red-500 text-[10px] sm:text-xs mt-1">{errors.zip.message}</p>}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Country
                </label>
                <input
                  className="form-input text-base"
                  placeholder="USA"
                  defaultValue="USA"
                  {...register('country')}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                {...register('isDefault')}
              />
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Set as default address</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); reset(); }}
                className="btn-secondary py-2.5 px-4 text-sm flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary py-2.5 px-4 text-sm flex-1 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save Address'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address List */}
      {addresses.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
          <p className="text-2xl sm:text-3xl mb-2 sm:mb-3">📍</p>
          <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1 text-sm sm:text-base">No addresses saved</p>
          <p className="text-xs sm:text-sm text-gray-400 mb-4">Add your first delivery address for faster checkout.</p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-2"
            >
              <FiPlus size={16} />
              Add Address
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div
              key={address._id}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                address.isDefault
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {address.isDefault && (
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary-500 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center gap-1">
                  <FiStar size={10} />
                  Default
                </div>
              )}
              
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                    {address.street}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5">
                    {address.city}{address.state ? `, ${address.state}` : ''} {address.zip}
                  </p>
                  {address.country && address.country !== 'USA' && (
                    <p className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">{address.country}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  {!address.isDefault && (
                    <button
                      onClick={() => onSetDefault(address._id)}
                      className="p-2 text-gray-400 hover:text-primary-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Set as default"
                    >
                      <FiStar size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteAddress(address._id)}
                    disabled={deleting === address._id}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Delete address"
                  >
                    {deleting === address._id ? (
                      <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin block" />
                    ) : (
                      <FiTrash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {addresses.length < 5 && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:border-primary-300 hover:text-primary-500 dark:hover:border-primary-700 dark:hover:text-primary-400 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <FiPlus size={16} />
              Add another address ({5 - addresses.length} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Password Change Form Component ────────────────────────
function PasswordChangeForm() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onBlur' });

  const newPassword = watch('newPassword', '');

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: '33%' };
    if (score <= 3) return { label: 'Fair', color: 'bg-yellow-500', width: '66%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const strength = getPasswordStrength(newPassword);

  const onChangePassword = async (data) => {
    try {
      await userService.changePassword(data);
      toast.success('Password changed successfully!');
      reset();
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    }
  };

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4 sm:mb-5">
        <FiLock className="w-5 h-5 text-primary-500" />
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Change Password</h2>
      </div>
      
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-5">
        For security, please enter your current password before setting a new one.
      </p>

      <form onSubmit={handleSubmit(onChangePassword)} noValidate className="space-y-4 sm:space-y-5 max-w-md">
        {/* Current Password */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              className={`form-input text-base pr-10 ${errors.currentPassword ? 'error' : ''}`}
              placeholder="Enter current password"
              {...register('currentPassword', { required: 'Current password is required' })}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showCurrent ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-red-500 text-[10px] sm:text-xs mt-1">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              className={`form-input text-base pr-10 ${errors.newPassword ? 'error' : ''}`}
              placeholder="Enter new password"
              {...register('newPassword', {
                required: 'New password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
                maxLength: { value: 128, message: 'Password cannot exceed 128 characters' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showNew ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-red-500 text-[10px] sm:text-xs mt-1">{errors.newPassword.message}</p>
          )}
          
          {/* Password strength indicator */}
          {newPassword && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: strength.width }}
                  />
                </div>
                <span className={`text-[10px] sm:text-xs font-medium ${
                  strength.label === 'Weak' ? 'text-red-500' :
                  strength.label === 'Fair' ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {strength.label}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                <li className={`flex items-center gap-1 ${newPassword.length >= 8 ? 'text-green-500' : ''}`}>
                  <FiCheck size={12} className={newPassword.length >= 8 ? 'opacity-100' : 'opacity-30'} />
                  At least 8 characters
                </li>
                <li className={`flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? 'text-green-500' : ''}`}>
                  <FiCheck size={12} className={/[A-Z]/.test(newPassword) ? 'opacity-100' : 'opacity-30'} />
                  One uppercase letter
                </li>
                <li className={`flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-green-500' : ''}`}>
                  <FiCheck size={12} className={/[0-9]/.test(newPassword) ? 'opacity-100' : 'opacity-30'} />
                  One number
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              className={`form-input text-base pr-10 ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="Confirm new password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === newPassword || 'Passwords do not match',
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-[10px] sm:text-xs mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary py-2.5 px-6 text-sm sm:text-base touch-manipulation flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Changing…
            </>
          ) : (
            <>
              <FiLock size={16} />
              Change Password
            </>
          )}
        </button>
      </form>
    </div>
  );
}
