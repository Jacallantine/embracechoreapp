'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupName, setSetupName] = useState('');
  const [setupMessage, setSetupMessage] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    setSetupMessage('');
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: setupSecret, email: setupEmail, password: setupPassword, name: setupName }),
      });
      const data = await res.json();
      if (res.ok) {
        setSetupMessage(data.message);
        setShowSetup(false);
      } else {
        setSetupMessage(data.error);
      }
    } catch {
      setSetupMessage('Setup failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/embrace-logo.svg" alt="Embrace" width={80} height={80} />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Embrace Chores</h1>
          <p className="text-gray-400">Sign in to manage chores</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace focus:border-transparent transition"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {error}
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-embrace hover:bg-embrace-dark text-white font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>
          </form>

          {setupMessage && (
            <div className="mt-4 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              {setupMessage}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-800">
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="text-sm text-gray-500 hover:text-gray-300 transition"
            >
              {showSetup ? 'Hide setup' : 'First time? Set up admin account'}
            </button>
            {showSetup && (
              <form onSubmit={handleSetup} className="mt-4 space-y-3">
                <input
                  type="text"
                  value={setupSecret}
                  onChange={e => setSetupSecret(e.target.value)}
                  placeholder="Setup secret key"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace focus:border-transparent transition"
                  required
                />
                <input
                  type="text"
                  value={setupName}
                  onChange={e => setSetupName(e.target.value)}
                  placeholder="Admin name"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace focus:border-transparent transition"
                  required
                />
                <input
                  type="email"
                  value={setupEmail}
                  onChange={e => setSetupEmail(e.target.value)}
                  placeholder="Admin email"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace focus:border-transparent transition"
                  required
                />
                <input
                  type="password"
                  value={setupPassword}
                  onChange={e => setSetupPassword(e.target.value)}
                  placeholder="Admin password (min 8 chars)"
                  minLength={8}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace focus:border-transparent transition"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-embrace hover:bg-embrace-dark text-white text-sm font-medium rounded-xl transition"
                >
                  Create SuperAdmin
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
