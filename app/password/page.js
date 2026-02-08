'use client';

import { useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function PasswordPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-400"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg mx-auto px-4 py-8"
      >
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Change Password</h1>
          <p className="text-gray-400 mt-1 text-sm">Update your account password</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-gray-900 rounded-2xl border border-gray-800 p-6"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace transition"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace transition"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace transition"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-3"
              >
                {success}
              </motion.div>
            )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-embrace hover:bg-embrace-dark text-white font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Changing...' : 'Change Password'}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
