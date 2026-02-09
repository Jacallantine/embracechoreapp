'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { motion } from 'framer-motion';

// Inline SVG component to avoid cold start loading issues (full embrace-logo.svg)
const EmbraceLogo = ({ size = 80 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 120" width={size} height={size}>
    <g fill="#5ABA47">
      <path d="M98.8,77.9L93,62.8c1.3-4.4,1.7-7.8,1.6-9.9c-0.3-5.2-3.6-5.7-4.9-5.7c-5.8,0-10.5,4.8-13.9,10H67c-4.4-6.5-8.4-9.1-12-7.8c-0.7,0.2-1.6,0.8-2.2,2.1c-1.1,2.4-0.6,7.1,0.7,12.4L45,77.6c-0.5,0.9-0.5,1.9,0,2.8s1.4,1.4,2.4,1.4h11.9c0.2,0.4,0.3,0.9,0.5,1.3c0.6,1.6,1.2,3.2,1.7,4.7c1.9,5.4,3.9,9.3,8,9.3c0.2,0,0.5,0,0.8-0.1C76,96.3,81.6,87.8,85,81.8h11.3c0.9,0,1.8-0.5,2.3-1.2C99,79.8,99.1,78.8,98.8,77.9z M89.6,50.9c0.5,0.1,1,0.2,1.1,2.2c0.1,1.4-0.1,3.3-0.6,5.5c-1.3-1-2.9-1.5-4.6-1.5s-5.2,0-5.2,0C83,53.6,86.2,50.6,89.6,50.9z M73.4,60.9c-0.8,1.4-1.4,3.5-2,4.7c-0.6-1.2-1.3-3.3-2.1-4.7C69.3,60.9,73.4,60.9,73.4,60.9z M55.9,53.8c0.1-0.7,0.8-1.1,1.5-0.9c1.4,0.4,3.1,2,4.8,4.3h-0.5c-2.1,0-4,0.9-5.4,2.3C55.7,56.4,55.8,54.7,55.9,53.8z M49,77.9l5.7-9.2c0.9,3.1,2,6.3,3,9.2H49z M82.9,77.3c-0.1,0.2-0.2,0.4-0.4,0.7h-8.4c-1,0-1.9,0.8-1.9,1.9c0,1,0.8,1.9,1.9,1.9h6.3c-4.8,8-8.5,11.2-10.8,11.5c-1.5,0.2-3.1-1.9-4.7-6.7c-0.5-1.5-1.1-3.1-1.7-4.8c-1.5-3.7-4.1-10.7-5.8-17.3l1-1.6c0.7-1.2,2-1.9,3.3-1.9h3.1c1.9,3,3.6,6.3,4.9,9.3c0.3,0.7,1,1.2,1.8,1.1c0.8,0,1.5-0.5,1.7-1.3c0.8-2.2,2.3-5.8,4.4-9.2c0,0,6.1,0,7.5,0s3,0.8,3.7,2.1C87.5,67.3,85.5,72.4,82.9,77.3z M86.8,77.9c1.7-3.4,3.1-6.6,4.2-9.5l3.7,9.5H86.8z"/>
      <path d="M94,100.3c-7.6-0.6-17.2,0-28.6,1.8c-8.4,1.3-14.8,2.9-14.8,2.9c-1,0.3-1.6,1.3-1.4,2.3c0.2,0.9,1,1.4,1.8,1.4c0.1,0,0.3,0,0.5-0.1s24.8-6.1,42.2-4.6c1,0.1,2-0.7,2-1.7C95.8,101.3,95.1,100.4,94,100.3z"/>
      <path d="M78.2,35.9c-1-1.3-2.4-1.9-3.8-1.6c-7,1.4-9.3,8.3-9.2,13.7c0,1.8,0.4,6,3,6.4c0.5,0.1,1.2,0.2,1.9,0.2c2.2,0,5.3-1,8-6.4C80.6,43.3,80.1,38.3,78.2,35.9z M74.8,46.6c-2.1,4.2-3.8,4.5-5.3,4.3c-0.4-1.2-0.8-4.9,0.5-8.2c0.9-2.2,2.4-3.7,4.3-4.4c0.6-0.2,1.2,0.1,1.4,0.6c0,0.1,0.1,0.1,0.1,0.2C76.2,40.7,76.3,43.5,74.8,46.6z"/>
    </g>
    <g fill="#5ABA47">
      <path d="M24.3,104.6l-4.3,3.3l3.4,4.4l4.3-3.3l2.1,2.7L19.2,120l-2.1-2.7l4-3.1l-3.4-4.4l-4,3.1l-2.1-2.7l10.7-8.3L24.3,104.6z"/>
      <path d="M14.6,102.3c-3.8,1.5-7.6-0.2-9.2-4.1c-1.6-3.8,0-7.7,3.8-9.3c3.8-1.5,7.6,0.2,9.2,4C19.9,96.9,18.4,100.8,14.6,102.3z M10.5,92.3c-2,0.8-3.1,2.8-2.2,4.9c0.8,2.1,3,2.8,5,1.9c2-0.8,3.1-2.8,2.2-4.9C14.7,92.1,12.6,91.5,10.5,92.3z"/>
      <path d="M13.7,72.4l-8.9,0.8l9.2,2.6l0.1,1.5l-8.6,4.2l8.9-0.8l0.3,3.5L1.4,85.4L1,80.6l7.1-3.5L0.4,75L0,70.2L13.4,69L13.7,72.4z"/>
      <path d="M14,65.5L0.7,63l1.8-9.7l3,0.6l-1.2,6.3l2.1,0.4l1.1-6.2l3,0.6l-1.1,6.2l2.2,0.4l1.2-6.3l3,0.6L14,65.5z"/>
      <path d="M14.6,52.9l-1.7-2.8c1.3-0.5,2.6-1.5,3.4-3.3c0.5-1.1,0.4-1.9-0.2-2.2c-1.6-0.7-3.3,6.9-8.1,4.8c-2.1-0.9-3.2-3.5-1.8-6.6c0.9-2,2.2-3.4,3.9-4.3l1.6,2.8c-1.3,0.7-2.3,1.8-2.9,3c-0.4,0.9-0.3,1.5,0.3,1.7c1.5,0.7,3.4-6.8,8-4.8c2.5,1.1,3.3,3.6,1.9,7C17.9,50.7,16.3,52.1,14.6,52.9z"/>
      <path d="M26.1,32c-0.9,1.1-2.5,1.2-3.5,0.3c-1.1-0.9-1.2-2.5-0.3-3.5c0.9-1.1,2.5-1.2,3.5-0.3C26.8,29.4,27,31,26.1,32z"/>
      <path d="M44.1,20.5l-2.8-4.6l-4.8,2.9l2.8,4.6l-3,1.8l-7-11.5l3-1.8l2.6,4.3l4.8-2.9L37.1,9l3-1.8l7,11.5L44.1,20.5z"/>
      <path d="M50.4,17.4L46.5,4.5L56,1.6l0.9,2.9l-6.1,1.9l0.6,2l6-1.8l0.9,2.9l-6,1.8l0.7,2.2l6.1-1.9l0.9,2.9L50.4,17.4z"/>
      <path d="M72.8,13.4l-0.7-1.9l-5.3,0.2l-0.6,2l-3.9,0.2l4.6-13.7L71.2,0l5.6,13.3L72.8,13.4z M69.1,3.5l-1.5,5.1L71,8.5L69.1,3.5z"/>
      <path d="M79.6,13.9l2.8-13.2l3.4,0.7l-2.2,10.2l5.3,1.1l-0.6,3L79.6,13.9z"/>
      <path d="M91.6,17l5-12.5l3.2,1.3l-5,12.5L91.6,17z"/>
      <path d="M106.2,24.9l-0.4-9.7l-4.3,6.5l-2.9-1.9l7.5-11.2l3,2l0.4,9.2l4.1-6.2l2.9,1.9L109,26.7L106.2,24.9z"/>
      <path d="M115.7,23.6c3.2-2.8,7.4-2.2,10.1,0.9c2,2.3,2,4.7,1.4,6.5l-3.1-1.2c0.3-1,0.3-2.3-0.6-3.3c-1.5-1.7-3.7-1.7-5.4-0.2c-1.7,1.5-1.9,3.7-0.4,5.4c0.7,0.7,1.6,1.2,2.3,1.3l0.8-0.7l-2-2.3l2.3-2l4.3,4.9l-4,3.5c-2.1,0-4.2-0.8-5.9-2.7C112.6,30.6,112.4,26.4,115.7,23.6z"/>
      <path d="M127.1,47.7c-0.5-1.3,0-2.7,1.3-3.3c1.3-0.5,2.7,0,3.3,1.3c0.5,1.3,0,2.7-1.3,3.3C129.1,49.6,127.6,49,127.1,47.7z"/>
      <path d="M129.5,69l5.4-0.5l-0.5-5.6l-5.4,0.5l-0.3-3.5l13.4-1.2l0.3,3.5l-5,0.4l0.5,5.6l5-0.4l0.3,3.5l-13.4,1.2L129.5,69z"/>
      <path d="M136.5,76.5c4,0.8,6.3,4.4,5.5,8.4s-4.2,6.5-8.2,5.7s-6.3-4.3-5.5-8.4C129,78.2,132.4,75.7,136.5,76.5z M134.4,87.2c2.2,0.4,4.1-0.7,4.5-2.9c0.4-2.2-1-3.9-3.1-4.4c-2.1-0.4-4.1,0.7-4.5,2.9C130.8,85.1,132.2,86.8,134.4,87.2z"/>
      <path d="M126,92l12.1,5.9l-3,6.1c-1.3,2.7-3.9,3.3-6.1,2.2c-2.2-1.1-3.3-3.5-1.9-6.2l1.4-2.9l-4.1-2L126,92z M130.6,103.1c0.8,0.4,1.6,0,2-0.9l1.2-2.5l-2.6-1.3l-1.2,2.5C129.6,101.8,129.7,102.7,130.6,103.1z"/>
      <path d="M119.7,103.8l10.5,8.4l-6.2,7.7l-2.4-1.9l4-5l-1.6-1.3l-3.9,4.9l-2.4-1.9l3.9-4.9l-1.8-1.4l-4,5l-2.4-1.9L119.7,103.8z"/>
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
