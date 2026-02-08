/**
 * Shared input validation helpers for API routes.
 */

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email is required';
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 255) return 'Email must be 255 characters or less';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return 'Invalid email format';
  return null;
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password must be 128 characters or less';
  return null;
}

export function validateName(name) {
  if (!name || typeof name !== 'string') return 'Name is required';
  const trimmed = name.trim();
  if (trimmed.length < 1) return 'Name is required';
  if (trimmed.length > 100) return 'Name must be 100 characters or less';
  return null;
}

export function validateChoreName(name) {
  if (!name || typeof name !== 'string') return 'Chore name is required';
  const trimmed = name.trim();
  if (trimmed.length < 1) return 'Chore name is required';
  if (trimmed.length > 100) return 'Chore name must be 100 characters or less';
  return null;
}

export function validateDescription(description) {
  if (description === undefined || description === null || description === '') return null;
  if (typeof description !== 'string') return 'Description must be a string';
  if (description.length > 500) return 'Description must be 500 characters or less';
  return null;
}

export function validateRole(role) {
  const validRoles = ['SUPERADMIN', 'ADMIN', 'SCHOLAR'];
  if (!role || !validRoles.includes(role)) return 'Invalid role';
  return null;
}

/**
 * Sanitize a string by trimming whitespace.
 */
export function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim();
}
