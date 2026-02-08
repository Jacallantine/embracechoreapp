'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function ConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState(null);
  const [timesPerWeek, setTimesPerWeek] = useState(2);
  const [selectedDays, setSelectedDays] = useState([1, 4]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setTimesPerWeek(data.config.timesPerWeek);
        setSelectedDays(data.config.choreDays);
      } else {
        setMessage('Failed to load settings');
      }
    } catch {
      setMessage('Network error — could not load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN'))) {
      router.push('/dashboard');
      return;
    }
    if (user) fetchConfig();
  }, [user, authLoading, router, fetchConfig]);

  const toggleDay = (dayValue) => {
    setSelectedDays(prev => {
      if (prev.includes(dayValue)) {
        return prev.filter(d => d !== dayValue).sort((a, b) => a - b);
      }
      return [...prev, dayValue].sort((a, b) => a - b);
    });
  };

  const handleSave = async () => {
    if (selectedDays.length !== timesPerWeek) {
      setMessage(`Please select exactly ${timesPerWeek} days`);
      return;
    }

    setSaving(true);
    setMessage('');
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timesPerWeek, choreDays: selectedDays }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('Settings saved successfully!');
      setConfig(data.config);
    } else {
      setMessage(data.error || 'Failed to save');
    }
    setSaving(false);
  };

  if (authLoading || !user || loading) {
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

  return (
    <div className="min-h-screen bg-gray-950">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-3xl mx-auto px-4 py-8"
      >
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Chore Settings</h1>
          <p className="text-gray-400 mt-1 text-sm">Configure how often and which days chores are done</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-8">
          {/* Times per week */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Times per week
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <motion.button
                  key={n}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setTimesPerWeek(n);
                    setSelectedDays([]);
                  }}
                  className={`w-12 h-12 rounded-xl font-medium transition ${
                    timesPerWeek === n
                      ? 'bg-embrace text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {n}
                </motion.button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Scholars will do their assigned chore {timesPerWeek} time{timesPerWeek !== 1 ? 's' : ''} per week
            </p>
          </div>

          {/* Chore days */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Chore days <span className="text-gray-500">(select {timesPerWeek})</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DAYS.map(day => (
                <motion.button
                  key={day.value}
                  whileHover={!(!selectedDays.includes(day.value) && selectedDays.length >= timesPerWeek) ? { scale: 1.02 } : {}}
                  whileTap={!(!selectedDays.includes(day.value) && selectedDays.length >= timesPerWeek) ? { scale: 0.98 } : {}}
                  onClick={() => toggleDay(day.value)}
                  disabled={!selectedDays.includes(day.value) && selectedDays.length >= timesPerWeek}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition ${
                    selectedDays.includes(day.value)
                      ? 'bg-embrace text-white'
                      : selectedDays.length >= timesPerWeek
                        ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {day.label}
                </motion.button>
              ))}
            </div>
            {selectedDays.length !== timesPerWeek && (
              <p className="text-xs text-amber-400 mt-2">
                Select {timesPerWeek - selectedDays.length} more day{timesPerWeek - selectedDays.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Preview</h3>
            <p className="text-gray-400 text-sm">
              Chores will be done <span className="text-white font-medium">{timesPerWeek}x per week</span> on{' '}
              <span className="text-white font-medium">
                {selectedDays.length > 0
                  ? selectedDays.map(d => DAYS.find(day => day.value === d)?.label).join(' & ')
                  : '(select days)'}
              </span>
            </p>
          </div>

          <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-4 rounded-xl border text-sm ${
              message.includes('success') || message.includes('saved')
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              {message}
            </motion.div>
          )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSave}
            disabled={saving || selectedDays.length !== timesPerWeek}
            className="w-full py-3 bg-embrace hover:bg-embrace-dark text-white font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
