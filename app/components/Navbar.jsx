'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'SUPERADMIN' || user.role === 'ADMIN';

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', show: true },
    { href: '/leaderboard', label: 'Leaderboard', show: true },
    { href: '/users', label: 'Users', show: isAdmin },
    { href: '/chores', label: 'Chores', show: isAdmin },
    { href: '/config', label: 'Settings', show: isAdmin },
    { href: '/password', label: 'Password', show: true },
  ];

  const roleBadgeColor = {
    SUPERADMIN: 'bg-red-500/20 text-red-300 border-red-500/30',
    ADMIN: 'bg-embrace/20 text-embrace-light border-embrace/30',
    SCHOLAR: 'bg-embrace/20 text-embrace-light border-embrace/30',
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/embrace-logo.svg"
                alt="Embrace Alabama Kids"
                width={32}
                height={32}
                className="brightness-110"
              />
              <span className="text-base sm:text-lg font-bold text-white tracking-tight">Embrace Chores</span>
            </Link>
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.filter(l => l.show).map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-embrace/20 text-embrace-light'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className={`text-xs font-medium px-2 sm:px-2.5 py-1 rounded-full border ${roleBadgeColor[user.role]}`}>
              {user.role}
            </span>
            <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">{user.name}</span>
            <button
              onClick={logout}
              className="hidden lg:inline text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
            >
              Logout
            </button>
            {/* Hamburger menu button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-gray-400 hover:text-white p-2"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </motion.button>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-gray-800 bg-gray-900"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.filter(l => l.show).map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-embrace/20 text-embrace-light'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-gray-800 mt-3">
                <div className="text-xs text-gray-500 px-3 mb-2">{user.name}</div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
