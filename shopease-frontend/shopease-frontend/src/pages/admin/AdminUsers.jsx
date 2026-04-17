/**
 * src/pages/admin/AdminUsers.jsx
 * Full admin user management — search, add user, change role, delete user.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';

import { userService }            from '../../services/index';
import { authService }            from '../../services/authService';
import { fmtDate, getInitials }   from '../../utils/helpers';
import { useAuth }                from '../../hooks/useAuth';   // ✅ FIX #3 – need current user
import PageSpinner                from '../../components/common/PageSpinner';
import Modal                      from '../../components/common/Modal';

export default function AdminUsers() {
  const { user: currentUser }       = useAuth();                // ✅ FIX #3

  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [deleting,   setDeleting]   = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);
  const [addForm,    setAddForm]    = useState({ name: '', email: '', password: '', role: 'user' });
  const [addErrors,  setAddErrors]  = useState({});
  const [addLoading, setAddLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // ✅ FIX #8 – stable reference with useCallback
  const load = useCallback(() => {
    setLoading(true);
    userService.getAllUsers()                                    // ✅ FIX #4 – removed hard limit of 200
      .then(({ users: u }) => setUsers(u))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ✅ FIX #11 – memoised filtered list
  const filtered = useMemo(() =>
    users.filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ), [users, search]);

  // ── Change role (toggle admin ↔ user) ─────────────────
  // ✅ FIX #2 – wired to real API call
  // ✅ FIX #7 – guard against demoting the last admin
  const handleRoleChange = async (user, newRole) => {
    // Prevent demoting self
    if (user._id === currentUser?._id) {                       // ✅ FIX #3
      toast.error("You can't change your own role");
      return;
    }

    // Prevent demoting the last admin
    if (newRole === 'user') {
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        toast.error("Can't demote the last admin account");
        return;
      }
    }

    setUpdatingId(user._id);
    try {
      await userService.updateUserRole(user._id, newRole);     // ✅ FIX #2 – real API call
      setUsers((prev) =>
        prev.map((u) => u._id === user._id ? { ...u, role: newRole } : u)
      );
      toast.success(`${user.name} is now ${newRole}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Delete user ────────────────────────────────────────
  // ✅ FIX #1 – wired to real API call
  // ✅ FIX #3 – guard against self-deletion
  const handleDelete = async () => {
    if (!deleting) return;

    if (deleting._id === currentUser?._id) {                   // ✅ FIX #3
      toast.error("You can't delete your own account");
      setDeleting(null);
      return;
    }

    try {
      await userService.deleteUser(deleting._id);              // ✅ FIX #1 – real API call
      setUsers((prev) => prev.filter((u) => u._id !== deleting._id));
      toast.success(`${deleting.name} has been removed`);
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // ── Validate add-user form ─────────────────────────────
  const validateAdd = () => {
    const e = {};
    if (!addForm.name.trim())    e.name     = 'Name is required';
    if (!addForm.email.trim())   e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(addForm.email)) e.email = 'Invalid email';
    if (!addForm.password)       e.password = 'Password is required';
    else if (addForm.password.length < 6) e.password = 'Min 6 characters';
    return e;
  };

  // ── Reset add-user form ────────────────────────────────
  // ✅ FIX #9 – shared reset helper used on both cancel and close
  const resetAddForm = () => {
    setAddForm({ name: '', email: '', password: '', role: 'user' });
    setAddErrors({});
  };

  // ── Add new user via register endpoint ─────────────────
  // ✅ FIX #10 – role is now passed to the service call
  const handleAddUser = async () => {
    const e = validateAdd();
    if (Object.keys(e).length) { setAddErrors(e); return; }
    setAddLoading(true);
    try {
      await authService.register({
        name:     addForm.name,
        email:    addForm.email,
        password: addForm.password,
        role:     addForm.role,                                 // ✅ FIX #10 – pass role
      });
      toast.success(`User ${addForm.name} created!`);
      setShowAdd(false);
      resetAddForm();                                          // ✅ FIX #9
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  const setField = (k) => (e) => {
    setAddForm((f) => ({ ...f, [k]: e.target.value }));
    if (addErrors[k]) setAddErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const renderDefaultAddress = (user) => {
    const defaultAddress = user.addresses?.find((address) => address.isDefault);

    if (!defaultAddress) {
      return (
        <span className="text-xs text-gray-400">
          {user.addresses?.length ? 'No default set' : 'No addresses'}
        </span>
      );
    }

    return (
      <div className="max-w-xs">
        <span className="inline-flex text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full mb-1">
          Default
        </span>
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          {defaultAddress.street}, {defaultAddress.city}
          {defaultAddress.state ? `, ${defaultAddress.state}` : ''} - {defaultAddress.zip}
        </p>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Users</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{users.length} registered users</p>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="form-input flex-1 sm:flex-none sm:max-w-xs text-sm py-2" />
          <button onClick={() => { setShowAdd(true); resetAddForm(); }}
            className="btn-primary text-sm py-2 px-4 sm:px-5 flex items-center gap-1 sm:gap-2 whitespace-nowrap">
            <span className="text-lg leading-none">+</span> <span className="hidden xs:inline">Add</span> User
          </button>
        </div>
      </div>

      {loading ? <PageSpinner /> : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-5 py-3 font-semibold">User</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Joined</th>
                    <th className="px-5 py-3 font-semibold">Default Address</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user._id}
                      className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                      {/* Avatar + Name */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {getInitials(user.name)}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {user.name}
                            {user._id === currentUser?._id && (
                              <span className="ml-2 text-xs font-normal text-gray-400">(you)</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{user.email}</td>

                      {/* Role — clickable toggle */}
                      <td className="px-5 py-3">
                        <button
                          disabled={updatingId === user._id || user._id === currentUser?._id}
                          onClick={() => handleRoleChange(user, user.role === 'admin' ? 'user' : 'admin')}
                          title={
                            user._id === currentUser?._id
                              ? "You can't change your own role"
                              : 'Click to toggle role'
                          }
                          aria-label={`${user.name} is ${user.role}. Click to toggle role.`}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize transition-colors border ${
                            user._id === currentUser?._id
                              ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                              : user.role === 'admin'
                                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-primary-300 dark:border-primary-700 hover:bg-primary-200 cursor-pointer'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer'
                          }`}>
                          {updatingId === user._id ? '…' : user.role}
                        </button>
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {user.createdAt ? fmtDate(user.createdAt) : '—'}
                      </td>

                      {/* Default Address */}
                      <td className="px-5 py-3 text-gray-500">{renderDefaultAddress(user)}</td>

                      {/* Actions */}
                      <td className="px-5 py-3">
                        {user._id !== currentUser?._id && (
                          <button
                            onClick={() => setDeleting(user)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 py-12 text-sm">No users found</p>
              )}
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {filtered.map((user) => (
              <div key={user._id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                        {user.name}
                        {user._id === currentUser?._id && (
                          <span className="ml-1 text-xs font-normal text-gray-400">(you)</span>
                        )}
                      </h3>
                      <button
                        disabled={updatingId === user._id || user._id === currentUser?._id}
                        onClick={() => handleRoleChange(user, user.role === 'admin' ? 'user' : 'admin')}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize transition-colors border flex-shrink-0 ${
                          user._id === currentUser?._id
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                            : user.role === 'admin'
                              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-primary-300 dark:border-primary-700'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                        }`}>
                        {updatingId === user._id ? '…' : user.role}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-gray-400">
                        Joined {user.createdAt ? fmtDate(user.createdAt) : '—'}
                      </p>
                      {user._id !== currentUser?._id && (
                        <button
                          onClick={() => setDeleting(user)}
                          className="text-[10px] font-semibold text-red-500 hover:text-red-600 touch-manipulation">
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="mt-3">{renderDefaultAddress(user)}</div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-12 text-sm">No users found</p>
            )}
          </div>
        </>
      )}

      {/* ── Add User Modal ──────────────────────────────── */}
      {/* ✅ FIX #9 – resetAddForm called on close/cancel */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetAddForm(); }} title="Add New User" maxWidth="max-w-md">
        <div className="p-6 space-y-4">
          {[
            { key: 'name',     label: 'Full Name *',       type: 'text',     placeholder: 'John Doe' },
            { key: 'email',    label: 'Email Address *',   type: 'email',    placeholder: 'john@example.com' },
            { key: 'password', label: 'Password *',        type: 'password', placeholder: 'Min 6 characters' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={addForm[key]}
                onChange={setField(key)}
                className={`form-input text-sm py-2 ${addErrors[key] ? 'error' : ''}`}
              />
              {addErrors[key] && <p className="text-red-500 text-xs mt-1">{addErrors[key]}</p>}
            </div>
          ))}

          {/* ✅ FIX #10 – role is tracked and passed; field retained in UI */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Role</label>
            <select value={addForm.role} onChange={setField('role')}
              className="form-input text-sm py-2">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleAddUser} disabled={addLoading}
              className="btn-primary flex-1 py-2.5 justify-center text-sm">
              {addLoading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating…
                  </span>
                : 'Create User'}
            </button>
            <button onClick={() => { setShowAdd(false); resetAddForm(); }} className="btn-outline py-2.5 px-5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ────────────────────────── */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} maxWidth="max-w-sm">
        <div className="p-6 text-center">
          <div className="text-5xl mb-4">🗑️</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete User?</h3>
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-semibold text-gray-700 dark:text-gray-200">{deleting?.name}</span>
            {' '}({deleting?.email}) will be removed. This cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleDelete}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full text-sm transition-colors">
              Yes, Delete
            </button>
            <button onClick={() => setDeleting(null)} className="btn-outline py-2.5 px-5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
