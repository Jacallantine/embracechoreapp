'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { motion } from 'framer-motion';

// Inline SVG component to avoid cold start loading issues
const EmbraceLogo = ({ size = 80 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 120" width={size} height={size}>
    <g fill="#5ABA47">
      <path d="M98.8,77.9L93,62.8c1.3-4.4,1.7-7.8,1.6-9.9c-0.3-5.2-3.6-5.7-4.9-5.7c-5.8,0-10.5,4.8-13.9,10H67c-4.4-6.5-8.4-9.1-12-7.8c-0.7,0.2-1.6,0.8-2.2,2.1c-1.1,2.4-0.6,7.1,0.7,12.4L45,77.6c-0.5,0.9-0.5,1.9,0,2.8s1.4,1.4,2.4,1.4h11.9c0.2,0.4,0.3,0.9,0.5,1.3c0.6,1.6,1.2,3.2,1.7,4.7c1.9,5.4,3.9,9.3,8,9.3c0.2,0,0.5,0,0.8-0.1C76,96.3,81.6,87.8,85,81.8h11.3c0.9,0,1.8-0.5,2.3-1.2C99,79.8,99.1,78.8,98.8,77.9z M89.6,50.9c0.5,0.1,1,0.2,1.1,2.2c0.1,1.4-0.1,3.3-0.6,5.5c-1.3-1-2.9-1.5-4.6-1.5s-5.2,0-5.2,0C83,53.6,86.2,50.6,89.6,50.9z M73.4,60.9c-0.8,1.4-1.4,3.5-2,4.7c-0.6-1.2-1.3-3.3-2.1-4.7C69.3,60.9,73.4,60.9,73.4,60.9z M55.9,53.8c0.1-0.7,0.8-1.1,1.5-0.9c1.4,0.4,3.1,2,4.8,4.3h-0.5c-2.1,0-4,0.9-5.4,2.3C55.7,56.4,55.8,54.7,55.9,53.8z M49,77.9l5.7-9.2c0.9,3.1,2,6.3,3,9.2H49z M82.9,77.3c-0.1,0.2-0.2,0.4-0.4,0.7h-8.4c-1,0-1.9,0.8-1.9,1.9c0,1,0.8,1.9,1.9,1.9h6.3c-4.8,8-8.5,11.2-10.8,11.5c-1.5,0.2-3.1-1.9-4.7-6.7c-0.5-1.5-1.1-3.1-1.7-4.8c-1.5-3.7-4.1-10.7-5.8-17.3l1-1.6c0.7-1.2,2-1.9,3.3-1.9h3.1c1.9,3,3.6,6.3,4.9,9.3c0.3,0.7,1,1.2,1.8,1.1c0.8,0,1.5-0.5,1.7-1.3c0.8-2.2,2.3-5.8,4.4-9.2c0,0,6.1,0,7.5,0s3,0.8,3.7,2.1C87.5,67.3,85.5,72.4,82.9,77.3z M86.8,77.9c1.7-3.4,3.1-6.6,4.2-9.5l3.7,9.5H86.8z"/>
      <path d="M94,100.3c-7.6-0.6-17.2,0-28.6,1.8c-8.4,1.3-14.8,2.9-14.8,2.9c-1,0.3-1.6,1.3-1.4,2.3c0.2,0.9,1,1.4,1.8,1.4c0.2,0,0.3,0,0.5-0.1c0,0,6.3-1.6,14.5-2.9c11-1.7,20.3-2.3,27.5-1.7c1,0.1,1.9-0.6,2-1.7C95.6,101.4,94.9,100.4,94,100.3z"/>
      <path d="M50.3,19.5c7.6,0.6,17.2,0,28.6-1.8c8.4-1.3,14.8-2.9,14.8-2.9c1-0.3,1.6-1.3,1.4-2.3c-0.2-0.9-1-1.4-1.8-1.4c-0.2,0-0.3,0-0.5,0.1c0,0-6.3,1.6-14.5,2.9c-11,1.7-20.3,2.3-27.5,1.7c-1-0.1-1.9,0.6-2,1.7C48.7,18.4,49.4,19.4,50.3,19.5z"/>
    </g>
  </svg>
);

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
            <EmbraceLogo size={80} />
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
