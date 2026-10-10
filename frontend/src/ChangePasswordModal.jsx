import React, { useState } from 'react';
import axios from 'axios';

export default function ChangePasswordModal({ user, onClose, theme = 'green' }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isDark = theme === 'dark';
  const isSand = theme === 'sand';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!newPassword) {
      setError('Please enter your new password.');
      return;
    }
    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        '/api/auth/change-password',
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess(response.data?.message || 'Password changed successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password. Please verify current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all ${
        isDark 
          ? 'bg-[#131924] text-gray-100 border-[#c5a880]/30 shadow-black/80' 
          : isSand
            ? 'bg-[#faf8f5] text-[#2d2417] border-[#dfd5bc] shadow-amber-950/10'
            : 'bg-white text-gray-800 border-gray-200 shadow-xl'
      }`}>
        <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <div>
              <h3 className={`text-lg font-bold leading-tight ${isDark ? 'text-[#f5deb3]' : isSand ? 'text-[#5c4c36]' : 'text-gray-900'}`}>
                Change Password
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                User: <span className="font-semibold">{user?.username}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg text-lg cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <span>✅</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Current Password <span className="text-red-500">*</span>
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter existing password"
              disabled={loading || Boolean(success)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-hidden focus:ring-2 ${
                isDark
                  ? 'bg-[#1a2332] border-slate-700 text-white focus:ring-[#d4af37]'
                  : isSand
                    ? 'bg-white border-[#dfd5bc] text-gray-900 focus:ring-[#8c734b]'
                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-emerald-500'
              }`}
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              New Password <span className="text-red-500">*</span>
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 4 characters)"
              disabled={loading || Boolean(success)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-hidden focus:ring-2 ${
                isDark
                  ? 'bg-[#1a2332] border-slate-700 text-white focus:ring-[#d4af37]'
                  : isSand
                    ? 'bg-white border-[#dfd5bc] text-gray-900 focus:ring-[#8c734b]'
                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-emerald-500'
              }`}
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={loading || Boolean(success)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-hidden focus:ring-2 ${
                isDark
                  ? 'bg-[#1a2332] border-slate-700 text-white focus:ring-[#d4af37]'
                  : isSand
                    ? 'bg-white border-[#dfd5bc] text-gray-900 focus:ring-[#8c734b]'
                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-emerald-500'
              }`}
              required
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 dark:text-gray-400 select-none">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-0"
              />
              <span>Show passwords</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-gradient-to-r from-[#d4af37] to-[#aa841e] text-slate-900 hover:brightness-110'
                  : isSand
                    ? 'bg-[#8c734b] hover:bg-[#7a643f]'
                    : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {loading ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
