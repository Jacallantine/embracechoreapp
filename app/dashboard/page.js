'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [dailyAssignments, setDailyAssignments] = useState([]);
  const [config, setConfig] = useState(null);
  const [weekStart, setWeekStart] = useState('');
  const [editable, setEditable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [chores, setChores] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setEditingId(null); // Close any open editor when changing weeks
    try {
      const date = new Date();
      date.setDate(date.getDate() + weekOffset * 7);
      const res = await fetch(`/api/assignments?week=${date.toISOString()}&t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
        setDailyAssignments(data.dailyAssignments || []);
        setConfig(data.config);
        setWeekStart(data.weekStart);
        setEditable(data.editable || false);
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  const fetchChores = useCallback(async () => {
    try {
      const res = await fetch('/api/chores');
      if (res.ok) {
        const data = await res.json();
        setChores(data.chores || []);
      }
    } catch (err) {
      console.error('Failed to fetch chores:', err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchAssignments();
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
        fetchChores();
      }
    }
  }, [user, authLoading, router, fetchAssignments, fetchChores]);

  const toggleComplete = async (assignmentId, currentStatus) => {
    // Optimistic update
    const previousAssignments = [...assignments];
    setAssignments(prev => prev.map(a => 
      a.id === assignmentId ? { ...a, completed: !currentStatus } : a
    ));
    
    try {
      const res = await fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, completed: !currentStatus }),
      });
      if (!res.ok) {
        // Revert on failure
        setAssignments(previousAssignments);
      }
    } catch {
      // Revert on error
      setAssignments(previousAssignments);
    }
  };

  const toggleDailyComplete = async (daily, currentStatus) => {
    // Optimistic update
    const previousDailyAssignments = [...dailyAssignments];
    setDailyAssignments(prev => prev.map(d => 
      (d.choreId === daily.choreId && d.userId === daily.userId && d.dayOfWeek === daily.dayOfWeek)
        ? { ...d, completed: !currentStatus }
        : d
    ));
    
    try {
      const res = await fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDaily: true,
          choreId: daily.choreId,
          userId: daily.userId,
          dayOfWeek: daily.dayOfWeek,
          weekStart: weekStart,
          completed: !currentStatus,
        }),
      });
      if (!res.ok) {
        // Revert on failure
        setDailyAssignments(previousDailyAssignments);
      }
    } catch {
      // Revert on error
      setDailyAssignments(previousDailyAssignments);
    }
  };

  const reassignChore = async (assignmentId, newChoreId) => {
    setSaving(true);
    
    // Find the chore details for optimistic update
    const newChore = newChoreId ? chores.find(c => c.id === newChoreId) : null;
    
    // Optimistic update - update all assignments for this user 
    const previousAssignments = [...assignments];
    const targetAssignment = assignments.find(a => a.id === assignmentId);
    if (targetAssignment) {
      setAssignments(prev => prev.map(a => 
        a.userId === targetAssignment.userId 
          ? { ...a, choreId: newChoreId || null, chore: newChore ? { id: newChore.id, name: newChore.name, description: newChore.description } : null }
          : a
      ));
    }
    
    try {
      const res = await fetch('/api/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, choreId: newChoreId || null }),
      });
      if (res.ok) {
        setEditingId(null);
        // Refresh to get accurate state after potential swaps
        fetchAssignments();
      } else {
        const err = await res.json();
        // Revert on failure
        setAssignments(previousAssignments);
        alert(err.error || 'Failed to reassign chore');
      }
    } catch (err) {
      console.error('Failed to reassign chore:', err);
      // Revert on error
      setAssignments(previousAssignments);
      alert('Failed to reassign chore');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  const isAdmin = user.role === 'SUPERADMIN' || user.role === 'ADMIN';
  const isSuperAdmin = user.role === 'SUPERADMIN';

  // Check if an assignment is a computed (future projection) that can't be modified
  const isComputed = (assignment) => assignment.isComputed || (assignment.id && assignment.id.startsWith('computed-'));

  // Check if all chore days for the current week have passed (only superadmin can still edit)
  const areChoresDaysPassed = () => {
    if (!config || weekOffset !== 0) return false; // Only applies to current week
    const today = new Date().getDay(); // 0-6 (Sunday-Saturday)
    const lastChoreDay = Math.max(...config.choreDays);
    return today > lastChoreDay;
  };

  // Check if chore days haven't started yet (before first chore day of the week)
  const areChoresDaysNotStarted = () => {
    if (!config || weekOffset !== 0) return false; // Only applies to current week
    const today = new Date().getDay(); // 0-6 (Sunday-Saturday)
    const firstChoreDay = Math.min(...config.choreDays);
    return today < firstChoreDay;
  };

  const choreDaysPassed = areChoresDaysPassed();
  const choreDaysNotStarted = areChoresDaysNotStarted();
  const choreDaysLocked = choreDaysPassed || choreDaysNotStarted;

  // Track which chores are already assigned this week (to warn in dropdown)
  const assignedChoreIds = new Set(assignments.filter(a => a.choreId).map(a => a.choreId));

  const formatWeek = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    // Use UTC to avoid timezone shifts
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-5xl mx-auto px-4 py-8"
      >
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {user.role === 'SCHOLAR' ? 'My Chores' : 'Chore Schedule'}
              </h1>
              {config && (
                <p className="text-gray-400 mt-1 text-sm">
                  {config.timesPerWeek}x per week on {config.choreDays.map(d => DAY_SHORT[d]).join(' & ')}
                </p>
              )}
            </div>
            {user.role === 'SCHOLAR' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl"
              >
                <span className="text-amber-400 text-lg">⭐</span>
                <span className="text-amber-300 font-medium">{user.points || 0} points</span>
              </motion.div>
            )}
          </div>
          <div className="flex items-center flex-col-reverse md:flex-row md:justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setWeekOffset(w => w - 1)}
                className="px-2 md:w-fit w-16 sm:px-3 h-10 md:h-fit md:py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition no-print text-sm"
              >
                ← <span className="hidden sm:inline">Prev</span>
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className="px-3 sm:px-4 h-10 md:h-fit md:py-2 bg-embrace/20 text-embrace-light rounded-lg hover:bg-embrace/30 transition text-xs sm:text-sm no-print whitespace-nowrap"
              >
                This Week
              </button>
              <button
                onClick={() => setWeekOffset(w => w + 1)}
                className="px-2 md:w-fit w-16 sm:px-3 h-10 md:h-fit md:py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition no-print text-sm"
              >
                <span className="hidden sm:inline">Next</span> →
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition no-print"
              title="Print this week's schedule"
            >
              🖨️
            </button>
          </div>
        </div>

        <div className="print-header">
          <h2>Embrace Chore Schedule</h2>
          <p>{formatWeek(weekStart)}</p>
          {config && <p className="print-subtext">{config.timesPerWeek}x per week on {config.choreDays.map(d => DAY_SHORT[d]).join(' & ')}</p>}
        </div>

        <motion.div 
          key={weekStart}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="text-center mb-6"
        >
          <span className="text-base sm:text-lg font-medium text-gray-300">{formatWeek(weekStart)}</span>
          {choreDaysNotStarted && !isSuperAdmin && (
            <p className="text-amber-400 text-xs mt-1">Chore days haven&apos;t started yet — completion locked</p>
          )}
          {choreDaysPassed && !isSuperAdmin && (
            <p className="text-amber-400 text-xs mt-1">Chore days have passed — completion locked</p>
          )}
        </motion.div>

        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-gray-400"
          >
            Loading schedule...
          </motion.div>
        ) : assignments.length === 0 && dailyAssignments.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-8 sm:p-12 text-center"
          >
            <p className="text-gray-400 text-base sm:text-lg">No chore assignments for this week.</p>
            <p className="text-gray-500 mt-2 text-sm">Make sure there are scholars and chores set up.</p>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:gap-5">
            <AnimatePresence mode="wait">
            {/* Group by user - show weekly chore days and daily chores for each person */}
            {(() => {
              // Group weekly assignments by user
              const userAssignments = {};
              // Filter out assignments with deleted chores (chore is null but choreId exists)
              const validAssignments = assignments.filter(a => !a.choreId || a.chore);
              validAssignments.forEach(a => {
                if (!userAssignments[a.userId]) {
                  userAssignments[a.userId] = {
                    user: a.user,
                    userId: a.userId,
                    weeklyChores: [],
                  };
                }
                userAssignments[a.userId].weeklyChores.push(a);
              });
              
              // Also include users who only have daily chores (no weekly assignments)
              dailyAssignments.forEach(d => {
                if (!userAssignments[d.userId]) {
                  userAssignments[d.userId] = {
                    user: d.user,
                    userId: d.userId,
                    weeklyChores: [],
                  };
                }
              });
              
              return Object.values(userAssignments);
            })().map((userData, index) => {
              // Get daily assignments for this user
              const userDailyChores = dailyAssignments.filter(d => d.userId === userData.userId);
              // Get the first weekly chore to check if user has any chore
              const firstWeeklyChore = userData.weeklyChores[0];
              const hasChore = firstWeeklyChore?.chore;
              
              return (
                <motion.div
                  key={userData.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-5 hover:border-gray-700 transition"
                >
                  {/* Person Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg font-medium text-gray-400">
                        {userData.user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-white text-lg">{userData.user?.name}</span>
                    </div>
                    {isAdmin && firstWeeklyChore && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setEditingId(editingId === userData.userId ? null : userData.userId)}
                        className="text-gray-500 hover:text-embrace transition no-print"
                        title="Edit assignments"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </motion.button>
                    )}
                  </div>

                  {/* Weekly Chore Section - Shows each chore day separately */}
                  {userData.weeklyChores.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">📅 Weekly Chore</div>
                    {hasChore ? (
                      <div className="p-3 rounded-lg bg-gray-800/50">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="font-medium text-white">{firstWeeklyChore.chore.name}</span>
                          {firstWeeklyChore.chore.description && (
                            <span className="text-xs text-gray-500 hidden sm:inline">— {firstWeeklyChore.chore.description}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {userData.weeklyChores
                            .sort((a, b) => {
                              // Sort by actual day number (convert negative back to positive)
                              const dayA = a.dayOfWeek !== null && a.dayOfWeek < 0 ? Math.abs(a.dayOfWeek) - 1 : 0;
                              const dayB = b.dayOfWeek !== null && b.dayOfWeek < 0 ? Math.abs(b.dayOfWeek) - 1 : 0;
                              return dayA - dayB;
                            })
                            .map((weeklyChore, choreIdx) => {
                              // Get the actual day from the negative dayOfWeek (-2 = Monday -> 1)
                              const choreDay = weeklyChore.dayOfWeek !== null && weeklyChore.dayOfWeek < 0 
                                ? Math.abs(weeklyChore.dayOfWeek) - 1 
                                : null;
                              const choreDayName = choreDay !== null ? DAY_NAMES[choreDay] : 'All Week';
                              const today = new Date().getDay();
                              const isToday = choreDay === today && weekOffset === 0;
                              const isPast = weekOffset === 0 && choreDay !== null && choreDay < today;
                              const isFuture = weekOffset === 0 && choreDay !== null && choreDay > today;
                              const isDayLocked = (isPast || isFuture) && !isSuperAdmin;

                              return (
                                <motion.button
                                  key={weeklyChore.id}
                                  whileTap={{ scale: isDayLocked || isComputed(weeklyChore) ? 1 : 0.95 }}
                                  onClick={() => !isDayLocked && !isComputed(weeklyChore) && toggleComplete(weeklyChore.id, weeklyChore.completed)}
                                  disabled={isDayLocked || isComputed(weeklyChore)}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded transition ${
                                    weeklyChore.completed
                                      ? 'bg-embrace/30 border border-embrace/50'
                                      : isToday
                                        ? 'bg-blue-500/30 border border-blue-500/50'
                                        : isDayLocked || isComputed(weeklyChore)
                                          ? 'bg-gray-800/50 border border-gray-700/50 opacity-50 cursor-not-allowed'
                                          : 'bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30'
                                  }`}
                                  title={isDayLocked ? (isPast ? 'Day has passed' : 'Day not yet') : (weeklyChore.completed ? 'Mark incomplete' : 'Mark complete')}
                                >
                                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    weeklyChore.completed
                                      ? 'bg-embrace border-embrace'
                                      : isDayLocked || isComputed(weeklyChore)
                                        ? 'border-gray-600'
                                        : 'border-blue-400'
                                  }`}>
                                    {weeklyChore.completed && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </span>
                                  <span className={`text-xs font-medium ${
                                    weeklyChore.completed
                                      ? 'text-embrace line-through'
                                      : isToday
                                        ? 'text-blue-300'
                                        : isDayLocked || isComputed(weeklyChore)
                                          ? 'text-gray-500'
                                          : 'text-blue-400'
                                  }`}>
                                    {choreDayName.slice(0, 3)}
                                    {isToday && <span className="ml-1 text-[10px]">(Today)</span>}
                                  </span>
                                </motion.button>
                              );
                            })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-gray-800/50">
                        <span className="text-gray-500 text-sm">Free Day — No weekly chore</span>
                      </div>
                    )}
                    
                    {/* Edit weekly chore dropdown */}
                    {editingId === userData.userId && firstWeeklyChore && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2"
                      >
                        <select
                          defaultValue={firstWeeklyChore.choreId || ''}
                          onChange={(e) => reassignChore(firstWeeklyChore.id, e.target.value)}
                          disabled={saving}
                          className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:border-embrace focus:outline-none"
                        >
                          <option value="">Free Day (no weekly chore)</option>
                          {chores.filter(c => c.rotationType === 'WEEKLY').map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}{assignedChoreIds.has(c.id) && c.id !== firstWeeklyChore.choreId ? ' (already assigned)' : ''}
                            </option>
                          ))}
                        </select>
                      </motion.div>
                    )}
                  </div>
                  )}

                  {/* Daily Chores Section */}
                  {userDailyChores.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">🔄 Daily Chores</div>
                      <div className="space-y-2">
                        {/* Group by chore, show all days for that chore */}
                        {Object.values(
                          userDailyChores.reduce((acc, daily) => {
                            if (!acc[daily.choreId]) {
                              acc[daily.choreId] = { chore: daily.chore, days: [] };
                            }
                            acc[daily.choreId].days.push({
                              dayIndex: daily.dayIndex,
                              dayOfWeek: daily.dayOfWeek,
                              dayName: daily.dayName,
                              completed: daily.completed || false,
                              choreId: daily.choreId,
                              userId: daily.userId,
                            });
                            return acc;
                          }, {})
                        ).map(({ chore, days }) => {
                          const today = new Date().getDay();
                          return (
                            <div 
                              key={chore.id}
                              className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-white">{chore.name}</span>
                                {chore.description && (
                                  <span className="text-xs text-gray-500 hidden sm:inline">— {chore.description}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {days.sort((da, db) => da.dayIndex - db.dayIndex).map(d => {
                                  const isToday = d.dayIndex === today && weekOffset === 0;
                                  const isPast = weekOffset < 0 || (weekOffset === 0 && d.dayIndex < today);
                                  const isFuture = weekOffset > 0 || (weekOffset === 0 && d.dayIndex > today);
                                  const isLocked = (isPast || isFuture) && !isSuperAdmin;
                                  
                                  return (
                                    <motion.button
                                      key={d.dayIndex}
                                      whileTap={{ scale: isLocked ? 1 : 0.95 }}
                                      onClick={() => !isLocked && toggleDailyComplete(d, d.completed)}
                                      disabled={isLocked}
                                      className={`flex items-center gap-1.5 px-2 py-1 rounded transition ${
                                        d.completed
                                          ? 'bg-embrace/30 border border-embrace/50'
                                          : isToday
                                            ? 'bg-purple-500/30 border border-purple-500/50'
                                            : isLocked
                                              ? 'bg-gray-800/50 border border-gray-700/50 opacity-50 cursor-not-allowed'
                                              : 'bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30'
                                      }`}
                                      title={isLocked ? (isPast ? 'Day has passed' : 'Day not yet') : (d.completed ? 'Mark incomplete' : 'Mark complete')}
                                    >
                                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                        d.completed
                                          ? 'bg-embrace border-embrace'
                                          : isLocked
                                            ? 'border-gray-600'
                                            : 'border-purple-400'
                                      }`}>
                                        {d.completed && (
                                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </span>
                                      <span className={`text-xs font-medium ${
                                        d.completed
                                          ? 'text-embrace line-through'
                                          : isToday
                                            ? 'text-purple-300'
                                            : isLocked
                                              ? 'text-gray-500'
                                              : 'text-purple-400'
                                      }`}>
                                        {d.dayName.slice(0, 3)}
                                        {isToday && <span className="ml-1 text-[10px]">(Today)</span>}
                                      </span>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
