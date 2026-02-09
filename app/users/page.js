'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SCHOLAR' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mutating, setMutating] = useState(false);
  const [editingPoints, setEditingPoints] = useState(null);
  const [pointsInput, setPointsInput] = useState('');
  const [openMenu, setOpenMenu] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else {
        setError('Failed to load users');
      }
    } catch {
      setError('Network error — could not load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN'))) {
      router.push('/dashboard');
      return;
    }
    if (user) fetchUsers();
  }, [user, authLoading, router, fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setMutating(true);
    
    // Save form data before clearing
    const formData = { ...form };
    
    // Optimistic update - add temp user
    const tempId = `temp-${Date.now()}`;
    const tempUser = {
      id: tempId,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      points: 0,
      active: true,
    };
    setUsers(prev => [...prev, tempUser]);
    setForm({ name: '', email: '', password: '', role: 'SCHOLAR' });
    setShowForm(false);
    
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        // Replace temp user with real one
        setUsers(prev => prev.map(u => u.id === tempId ? data.user : u));
        setSuccess(`${data.user.name} created successfully!`);
      } else {
        // Remove temp user on failure
        setUsers(prev => prev.filter(u => u.id !== tempId));
        setError(data.error || 'Failed to create user');
      }
    } catch {
      // Remove temp user on error
      setUsers(prev => prev.filter(u => u.id !== tempId));
      setError('Network error — could not create user');
    } finally {
      setMutating(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Deactivate ${userName}?`)) return;
    setError('');
    setMutating(true);
    
    // Optimistic update - remove from list
    const previousUsers = [...users];
    setUsers(prev => prev.filter(u => u.id !== userId));
    
    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess(`${userName} deactivated`);
      } else {
        // Revert on failure
        setUsers(previousUsers);
        const data = await res.json();
        setError(data.error || 'Failed to deactivate user');
      }
    } catch {
      // Revert on error
      setUsers(previousUsers);
      setError('Network error — could not deactivate user');
    } finally {
      setMutating(false);
    }
  };

  const handlePointsChange = async (userId, action) => {
    const points = parseInt(pointsInput, 10);
    if (isNaN(points) || points < 0) {
      setError('Please enter a valid number');
      return;
    }
    setMutating(true);
    setError('');
    
    // Optimistic update
    const previousUsers = [...users];
    const targetUser = users.find(u => u.id === userId);
    const newPoints = action === 'add' 
      ? (targetUser?.points || 0) + points 
      : Math.max(0, (targetUser?.points || 0) - points);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, points: newPoints } : u));
    setEditingPoints(null);
    setPointsInput('');
    
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, points, action }),
      });
      const data = await res.json();
      if (res.ok) {
        // Update with actual value from server
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, points: data.user.points } : u));
        setSuccess(`Points updated for ${data.user.name}`);
      } else {
        // Revert on failure
        setUsers(previousUsers);
        setError(data.error || 'Failed to update points');
      }
    } catch {
      // Revert on error
      setUsers(previousUsers);
      setError('Network error — could not update points');
    } finally {
      setMutating(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const roleBadge = {
    SUPERADMIN: 'bg-red-500/20 text-red-300 border border-red-500/30',
    ADMIN: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    SCHOLAR: 'bg-embrace/20 text-embrace-light border border-embrace/30',
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-5xl mx-auto px-4 py-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">User Management</h1>
            <p className="text-gray-400 mt-1 text-sm">{users.length} users</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-embrace hover:bg-embrace-dark text-white font-medium rounded-xl transition"
          >
            {showForm ? 'Cancel' : '+ Add User'}
          </motion.button>
        </div>

        {(error || success) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mb-6 p-4 rounded-xl border text-sm ${
            error ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}>
            {error || success}
          </motion.div>
        )}

        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-8"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Create New User</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace transition"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace transition"
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace transition"
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-embrace transition"
                >
                  <option value="SCHOLAR">Scholar</option>
                  {user.role === 'SUPERADMIN' && <option value="ADMIN">Admin</option>}
                </select>
              </div>
              <div className="sm:col-span-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={mutating}
                  className="px-6 py-2.5 bg-embrace hover:bg-embrace-dark text-white font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mutating ? 'Creating...' : 'Create User'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}

        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-gray-400"
          >
            Loading users...
          </motion.div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence mode="wait">
            {users.map((u, index) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition relative"
              >
                <div className="flex sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-gray-800 flex items-center justify-center text-lg font-medium text-gray-400">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap pr-8 sm:pr-0">
                        {u.role === 'SCHOLAR' ? (
                          <Link
                            href={`/users/${u.id}`}
                            className="font-medium text-white hover:text-embrace transition truncate"
                          >
                            {u.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-white truncate">{u.name}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${roleBadge[u.role]}`}>
                          {u.role}
                        </span>
                        {u.role === 'SCHOLAR' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            ⭐ {u.points || 0} pts
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{u.email}</p>
                    </div>
                  </div>
                  {/* Desktop buttons */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    {u.role === 'SCHOLAR' && (
                      <Link
                        href={`/users/${u.id}`}
                        className="text-sm text-gray-500 hover:text-embrace px-3 py-2 rounded-lg hover:bg-embrace/10 transition"
                      >
                        History
                      </Link>
                    )}
                    {user.role === 'SUPERADMIN' && u.role === 'SCHOLAR' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setEditingPoints(editingPoints === u.id ? null : u.id);
                          setPointsInput('');
                        }}
                        className="text-sm text-gray-500 hover:text-amber-400 px-3 py-2 rounded-lg hover:bg-amber-500/10 transition"
                      >
                        {editingPoints === u.id ? 'Cancel' : 'Points'}
                      </motion.button>
                    )}
                    {u.id !== user.id && u.role !== 'SUPERADMIN' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(u.id, u.name)}
                        className="text-sm text-gray-500 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 transition"
                      >
                        Remove
                      </motion.button>
                    )}
                  </div>
                </div>
                  
                {/* Mobile dropdown - positioned top right (not shown for SUPERADMIN users) */}
                {u.role !== 'SUPERADMIN' && (
                  <div className="sm:hidden absolute top-2 right-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                      className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </motion.button>
                    <AnimatePresence>
                      {openMenu === u.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 overflow-hidden"
                        >
                          {u.role === 'SCHOLAR' && (
                            <Link
                              href={`/users/${u.id}`}
                              onClick={() => setOpenMenu(null)}
                              className="block w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-embrace transition"
                            >
                              📜 History
                            </Link>
                          )}
                          {user.role === 'SUPERADMIN' && u.role === 'SCHOLAR' && (
                            <button
                              onClick={() => {
                                setEditingPoints(editingPoints === u.id ? null : u.id);
                                setPointsInput('');
                                setOpenMenu(null);
                              }}
                              className="block w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-amber-400 transition"
                            >
                              ⭐ {editingPoints === u.id ? 'Cancel' : 'Points'}
                            </button>
                          )}
                          {u.id !== user.id && (
                            <button
                              onClick={() => {
                                setOpenMenu(null);
                                handleDelete(u.id, u.name);
                              }}
                              className="block w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-red-400 transition"
                            >
                              🗑️ Remove
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                {editingPoints === u.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-800"
                  >
                    <div className="flex flex-col gap-3">
                      <input
                        type="number"
                        min="0"
                        value={pointsInput}
                        onChange={e => setPointsInput(e.target.value)}
                        placeholder="Points amount"
                        className="w-full sm:w-32 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                      <div className="flex flex-wrap gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePointsChange(u.id, 'add')}
                          disabled={mutating}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-green-500/20 text-green-400 text-sm rounded-lg hover:bg-green-500/30 transition disabled:opacity-50"
                        >
                          + Add
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePointsChange(u.id, 'subtract')}
                          disabled={mutating}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-red-500/20 text-red-400 text-sm rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
                        >
                          − Subtract
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePointsChange(u.id, 'set')}
                          disabled={mutating}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
                        >
                          Set To
                        </motion.button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">Current: {u.points || 0} points</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
