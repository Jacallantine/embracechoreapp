'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChoresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chores, setChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', rotationType: 'WEEKLY' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', rotationType: 'WEEKLY' });
  const [mutating, setMutating] = useState(false);

  const fetchChores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chores');
      if (res.ok) {
        const data = await res.json();
        setChores(data.chores);
      } else {
        setError('Failed to load chores');
      }
    } catch {
      setError('Network error — could not load chores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN'))) {
      router.push('/dashboard');
      return;
    }
    if (user) fetchChores();
  }, [user, authLoading, router, fetchChores]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setMutating(true);
    try {
      const res = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`"${data.chore.name}" added!`);
        setForm({ name: '', description: '', rotationType: 'WEEKLY' });
        setShowForm(false);
        fetchChores();
      } else {
        setError(data.error || 'Failed to create chore');
      }
    } catch {
      setError('Network error — could not create chore');
    } finally {
      setMutating(false);
    }
  };

  const handleEdit = async (id) => {
    setError('');
    setMutating(true);
    try {
      const res = await fetch('/api/chores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (res.ok) {
        setEditingId(null);
        setSuccess('Chore updated!');
        fetchChores();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update chore');
      }
    } catch {
      setError('Network error — could not update chore');
    } finally {
      setMutating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove chore "${name}"?`)) return;
    setError('');
    setMutating(true);
    try {
      const res = await fetch(`/api/chores?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess(`"${name}" removed`);
        fetchChores();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to remove chore');
      }
    } catch {
      setError('Network error — could not remove chore');
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Chore Management</h1>
            <p className="text-gray-400 mt-1 text-sm">{chores.length} active chores</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-embrace hover:bg-embrace-dark text-white font-medium rounded-xl transition"
          >
            {showForm ? 'Cancel' : '+ Add Chore'}
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
            <h2 className="text-lg font-semibold text-white mb-4">Add New Chore</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Chore Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace transition"
                    placeholder="e.g. Kitchen Cleanup"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Rotation Type</label>
                  <select
                    value={form.rotationType}
                    onChange={e => setForm({...form, rotationType: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-embrace transition"
                  >
                    <option value="WEEKLY">Weekly Rotation</option>
                    <option value="DAILY">Daily Rotation</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-embrace transition"
                  placeholder="Wash dishes, wipe counters, sweep floor"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={mutating}
                className="px-6 py-2.5 bg-embrace hover:bg-embrace-dark text-white font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutating ? 'Adding...' : 'Add Chore'}
              </motion.button>
            </form>
          </motion.div>
        )}

        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-gray-400"
          >
            Loading chores...
          </motion.div>
        ) : chores.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-8 sm:p-12 text-center"
          >
            <p className="text-gray-400 text-lg">No chores yet.</p>
            <p className="text-gray-500 text-sm mt-2">Click &quot;+ Add Chore&quot; to create one.</p>
          </motion.div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence mode="wait">
            {chores.map((chore, index) => (
              <motion.div
                key={chore.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition"
              >
                {editingId === chore.id ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-embrace"
                      />
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-embrace"
                        placeholder="Description"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <select
                        value={editForm.rotationType}
                        onChange={e => setEditForm({...editForm, rotationType: e.target.value})}
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-embrace"
                      >
                        <option value="WEEKLY">Weekly Rotation</option>
                        <option value="DAILY">Daily Rotation</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(chore.id)}
                          disabled={mutating}
                          className="px-3 py-2 bg-embrace hover:bg-embrace-dark text-white text-sm rounded-lg transition disabled:opacity-50"
                        >
                          {mutating ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-sm font-mono text-gray-500">
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-white">{chore.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            chore.rotationType === 'DAILY' 
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}>
                            {chore.rotationType === 'DAILY' ? '🔄 Daily' : '📅 Weekly'}
                          </span>
                        </div>
                        {chore.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{chore.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setEditingId(chore.id);
                          setEditForm({ name: chore.name, description: chore.description || '', rotationType: chore.rotationType || 'WEEKLY' });
                        }}
                        className="text-sm text-gray-500 hover:text-embrace-light px-2 py-1 rounded-lg hover:bg-embrace/10 transition"
                      >
                        Edit
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(chore.id, chore.name)}
                        className="text-sm text-gray-500 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition"
                      >
                        Remove
                      </motion.button>
                    </div>
                  </div>
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
