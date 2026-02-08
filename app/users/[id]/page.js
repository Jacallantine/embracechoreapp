'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function UserHistoryPage({ params }) {
  const { id } = use(params);
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [weeklyHistory, setWeeklyHistory] = useState({});
  const [dailyHistory, setDailyHistory] = useState({});
  const [bonusPoints, setBonusPoints] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [bonusForm, setBonusForm] = useState({ points: '', reason: '' });
  const [bonusSaving, setBonusSaving] = useState(false);

  const fetchHistory = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/history?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setUserData(data.user);
        setWeeklyHistory(data.weeklyHistory || {});
        setDailyHistory(data.dailyHistory || {});
        setBonusPoints(data.bonusPoints || []);
        setCanEdit(data.canEdit || false);
      } else if (res.status === 404) {
        router.push('/users');
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }
    if (currentUser) {
      const isAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN';
      if (!isAdmin && currentUser.id !== id) {
        router.push('/dashboard');
        return;
      }
      fetchHistory();
    }
  }, [currentUser, authLoading, router, fetchHistory, id]);

  const toggleCompletion = async (assignmentId, currentStatus, isDaily = false) => {
    const newStatus = !currentStatus;
    
    // Optimistically update UI immediately
    if (isDaily) {
      setDailyHistory(prev => {
        const updated = { ...prev };
        for (const weekKey in updated) {
          updated[weekKey] = updated[weekKey].map(chore =>
            chore.id === assignmentId ? { ...chore, completed: newStatus } : chore
          );
        }
        return updated;
      });
    } else {
      setWeeklyHistory(prev => {
        const updated = { ...prev };
        for (const weekKey in updated) {
          updated[weekKey] = updated[weekKey].map(chore =>
            chore.id === assignmentId ? { ...chore, completed: newStatus } : chore
          );
        }
        return updated;
      });
    }
    
    // Update points optimistically
    setUserData(prev => prev ? {
      ...prev,
      points: prev.points + (newStatus ? 10 : -10)
    } : prev);
    
    setSaving(assignmentId);
    try {
      const res = await fetch(`/api/users/${id}/history`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, completed: newStatus }),
      });
      if (res.ok) {
        // Silently refetch to sync with server (no loading state)
        await fetchHistory(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update');
        // Revert on error
        await fetchHistory(false);
      }
    } catch (err) {
      console.error('Failed to toggle completion:', err);
      // Revert on error
      await fetchHistory(false);
    } finally {
      setSaving(null);
    }
  };

  const handleAddBonus = async (e) => {
    e.preventDefault();
    const points = parseInt(bonusForm.points, 10);
    if (isNaN(points) || points === 0) {
      alert('Please enter a valid non-zero points amount');
      return;
    }
    if (!bonusForm.reason.trim()) {
      alert('Please enter a reason');
      return;
    }

    setBonusSaving(true);
    try {
      const res = await fetch(`/api/users/${id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, reason: bonusForm.reason.trim() }),
      });
      if (res.ok) {
        setBonusForm({ points: '', reason: '' });
        setShowBonusForm(false);
        await fetchHistory(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add bonus');
      }
    } catch (err) {
      console.error('Failed to add bonus:', err);
    } finally {
      setBonusSaving(false);
    }
  };

  const handleDeleteBonus = async (bonusId, pointsAmount) => {
    if (!confirm(`Remove this bonus of ${pointsAmount > 0 ? '+' : ''}${pointsAmount} points?`)) return;

    setSaving(bonusId);
    try {
      const res = await fetch(`/api/users/${id}/history?bonusId=${bonusId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchHistory(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete bonus');
      }
    } catch (err) {
      console.error('Failed to delete bonus:', err);
    } finally {
      setSaving(null);
    }
  };

  const formatWeek = (dateStr) => {
    // Parse the date and adjust for timezone to show correct local dates
    const d = new Date(dateStr);
    // Use UTC methods to avoid timezone issues
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  };

  if (authLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading history...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">User not found</div>
      </div>
    );
  }

  const allWeeks = [...new Set([...Object.keys(weeklyHistory), ...Object.keys(dailyHistory)])].sort().reverse();

  return (
    <div className="min-h-screen bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto px-4 py-8"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/users"
              className="text-gray-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-xl font-medium text-gray-400">
                {userData.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{userData.name}</h1>
                <p className="text-gray-400 text-sm">{userData.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-embrace/20 text-embrace-light border-embrace/30">
              {userData.role}
            </span>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <span className="text-amber-400">⭐</span>
              <span className="text-amber-300 font-medium">{userData.points} pts</span>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📋</span>
            Chore History
          </h2>

          {allWeeks.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
              <p className="text-gray-400">No chore history found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {allWeeks.map((weekKey, weekIndex) => {
                  const weeklyChores = weeklyHistory[weekKey] || [];
                  const dailyChores = dailyHistory[weekKey] || [];

                  return (
                    <motion.div
                      key={weekKey}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: weekIndex * 0.03 }}
                      className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
                    >
                      {/* Week Header */}
                      <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800">
                        <span className="font-medium text-white">{formatWeek(weekKey)}</span>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Weekly Chores */}
                        {weeklyChores.map((chore) => (
                          <div
                            key={chore.id}
                            className={`flex items-center justify-between gap-3 p-3 rounded-lg ${
                              chore.completed ? 'bg-embrace/10 border border-embrace/20' : 'bg-gray-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {canEdit ? (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => toggleCompletion(chore.id, chore.completed, false)}
                                  disabled={saving === chore.id}
                                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                                    chore.completed
                                      ? 'bg-embrace border-embrace text-white'
                                      : 'border-gray-600 hover:border-embrace'
                                  } ${saving === chore.id ? 'opacity-50' : ''}`}
                                >
                                  {chore.completed && (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </motion.button>
                              ) : (
                                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                  chore.completed ? 'bg-embrace border-embrace text-white' : 'border-gray-600'
                                }`}>
                                  {chore.completed && (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium truncate ${chore.completed ? 'text-embrace' : 'text-white'}`}>
                                    {chore.choreName}
                                  </span>
                                  {chore.choreDayName ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                      {chore.choreDayName}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">Weekly</span>
                                  )}
                                  {!chore.choreActive && chore.choreId && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Deleted</span>
                                  )}
                                </div>
                                {chore.choreDescription && (
                                  <p className="text-xs text-gray-500 truncate">{chore.choreDescription}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {chore.completed ? (
                                <span className="text-xs font-medium text-embrace bg-embrace/20 px-2 py-0.5 rounded-full">
                                  +10 pts
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">Not done</span>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Daily Chores */}
                        {dailyChores.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-800">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Daily Chores</div>
                            <div className="space-y-2">
                              {dailyChores.map((chore) => (
                                <div
                                  key={chore.id}
                                  className={`flex items-center justify-between gap-3 p-2 rounded-lg ${
                                    chore.completed ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-gray-800/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {canEdit ? (
                                      <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => toggleCompletion(chore.id, chore.completed, true)}
                                        disabled={saving === chore.id}
                                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                                          chore.completed
                                            ? 'bg-purple-500 border-purple-500 text-white'
                                            : 'border-gray-600 hover:border-purple-400'
                                        } ${saving === chore.id ? 'opacity-50' : ''}`}
                                      >
                                        {chore.completed && (
                                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </motion.button>
                                    ) : (
                                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                        chore.completed ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-600'
                                      }`}>
                                        {chore.completed && (
                                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </div>
                                    )}
                                    <span className={`text-sm truncate ${chore.completed ? 'text-purple-300' : 'text-gray-300'}`}>
                                      {chore.choreName}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                                      {DAY_NAMES[chore.dayOfWeek]}
                                    </span>
                                    {!chore.choreActive && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Deleted</span>
                                    )}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    {chore.completed ? (
                                      <span className="text-[10px] font-medium text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded-full">
                                        +10
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-600">—</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {weeklyChores.length === 0 && dailyChores.length === 0 && (
                          <p className="text-gray-500 text-sm text-center py-2">No chores this week</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Bonus Points Section */}
        <div className="space-y-6 mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>🎁</span>
              Bonus Points
            </h2>
            {canEdit && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowBonusForm(!showBonusForm)}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium rounded-lg transition"
              >
                {showBonusForm ? 'Cancel' : '+ Add Bonus'}
              </motion.button>
            )}
          </div>

          {/* Add Bonus Form */}
          {showBonusForm && canEdit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-900 rounded-xl border border-gray-800 p-4"
            >
              <form onSubmit={handleAddBonus} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Points</label>
                    <input
                      type="number"
                      value={bonusForm.points}
                      onChange={e => setBonusForm({ ...bonusForm, points: e.target.value })}
                      placeholder="e.g. 10 or -5"
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Use negative numbers to subtract</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Reason</label>
                    <input
                      type="text"
                      value={bonusForm.reason}
                      onChange={e => setBonusForm({ ...bonusForm, reason: e.target.value })}
                      placeholder="e.g. Helped with extra cleaning"
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                      required
                    />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={bonusSaving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition disabled:opacity-50"
                >
                  {bonusSaving ? 'Adding...' : 'Add Bonus Points'}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* Bonus Points List */}
          {bonusPoints.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center">
              <p className="text-gray-400">No bonus points recorded.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {bonusPoints.map((bonus, index) => (
                  <motion.div
                    key={bonus.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                      bonus.points > 0
                        ? 'bg-green-500/10 border-green-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${bonus.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {bonus.points > 0 ? '+' : ''}{bonus.points} pts
                        </span>
                        <span className="text-white">{bonus.reason}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        By {bonus.awardedBy} • {new Date(bonus.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {canEdit && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteBonus(bonus.id, bonus.points)}
                        disabled={saving === bonus.id}
                        className="text-gray-500 hover:text-red-400 p-1 transition disabled:opacity-50"
                        title="Remove bonus"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
