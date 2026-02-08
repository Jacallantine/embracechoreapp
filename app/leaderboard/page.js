'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const MEDAL_COLORS = {
  1: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', icon: '🥇' },
  2: { bg: 'bg-gray-400/20', border: 'border-gray-400/50', text: 'text-gray-300', icon: '🥈' },
  3: { bg: 'bg-amber-600/20', border: 'border-amber-600/50', text: 'text-amber-500', icon: '🥉' },
};

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState([]);
  const [monthName, setMonthName] = useState('');
  const [currentMonth, setCurrentMonth] = useState(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate target month based on offset
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const monthParam = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      
      const res = await fetch(`/api/leaderboard?month=${monthParam}&t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setMonthName(data.monthName || '');
        setCurrentMonth(data.month);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [monthOffset]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchLeaderboard();
    }
  }, [user, authLoading, router, fetchLeaderboard]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  const isCurrentMonth = monthOffset === 0;

  return (
    <div className="min-h-screen bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-3xl mx-auto px-4 py-8"
      >
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                Leaderboard
              </h1>
              <p className="text-gray-400 mt-1 text-sm">
                Monthly points rankings
              </p>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center  gap-2 w-full justify-center ">
            <div className="flex items-center gap-1 sm:gap-2 justify-center">
              <button
                onClick={() => setMonthOffset(o => o - 1)}
                className="px-2 sm:px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition text-sm"
              >
                ← <span className="hidden sm:inline">Prev</span>
              </button>
              <button
                onClick={() => setMonthOffset(0)}
                disabled={isCurrentMonth}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap transition ${
                  isCurrentMonth
                    ? 'bg-embrace/20 text-embrace-light cursor-default'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setMonthOffset(o => o + 1)}
                disabled={monthOffset >= 0}
                className={`px-2 sm:px-3 py-2 bg-gray-800 text-gray-300 rounded-lg transition text-sm ${
                  monthOffset >= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'
                }`}
              >
                <span className="hidden sm:inline">Next</span> →
              </button>
            </div>
          </div>
        </div>

        {/* Month Header */}
        <motion.div
          key={monthName}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="text-center mb-6"
        >
          <span className="text-xl sm:text-2xl font-semibold text-white">{monthName}</span>
        </motion.div>

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-gray-400"
          >
            Loading leaderboard...
          </motion.div>
        ) : leaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-8 sm:p-12 text-center"
          >
            <p className="text-gray-400 text-base sm:text-lg">No scholars found.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {leaderboard.map((entry, index) => {
                const medal = MEDAL_COLORS[entry.rank];
                const isMe = entry.id === user.id;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className={`bg-gray-900 rounded-xl border p-4 sm:p-5 transition ${
                      isMe
                        ? 'border-embrace/50 ring-1 ring-embrace/30'
                        : medal
                          ? `${medal.border}`
                          : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Rank */}
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold flex-shrink-0 ${
                        medal
                          ? `${medal.bg} ${medal.text}`
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {medal ? medal.icon : entry.rank}
                      </div>

                      {/* Name & Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs sm:text-sm font-medium text-gray-400 flex-shrink-0">
                            {entry.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className={`font-semibold truncate text-sm sm:text-base ${isMe ? 'text-embrace-light' : 'text-white'}`}>
                            {entry.name}
                            {isMe && <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs text-embrace">(You)</span>}
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] sm:text-xs text-gray-500 pl-9 sm:pl-10">
                          {entry.monthlyCompletions} chore{entry.monthlyCompletions !== 1 ? 's' : ''} completed
                        </div>
                      </div>

                      {/* Points Section */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className={`text-lg sm:text-2xl font-bold ${
                          medal ? medal.text : 'text-amber-400'
                        }`}>
                          {entry.monthlyPoints}
                          <span className="text-[10px] sm:text-xs font-normal text-gray-500 ml-1">pts</span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded-full">
                          Total: {entry.totalPoints}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-4 bg-gray-900/50 rounded-xl border border-gray-800"
        >
          <h3 className="text-sm font-medium text-gray-400 mb-3">How points work</h3>
          <ul className="text-xs text-gray-500 space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="text-embrace">✓</span>
              Complete a weekly chore: <span className="text-amber-400 font-medium">+10 points</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-embrace">✓</span>
              Complete a daily chore: <span className="text-amber-400 font-medium">+10 points per day</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gray-600">•</span>
              Rankings reset monthly, but total points accumulate forever
            </li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
}
