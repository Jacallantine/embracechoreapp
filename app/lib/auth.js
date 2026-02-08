import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Set it in your .env file.');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, name: true, role: true, points: true, active: true },
  });

  if (!user || !user.active) return null;
  return user;
}

export function canManageUsers(role) {
  return role === 'SUPERADMIN' || role === 'ADMIN';
}

export function canManageAdmins(role) {
  return role === 'SUPERADMIN';
}

export function canManageChores(role) {
  return role === 'SUPERADMIN' || role === 'ADMIN';
}

export function canManageConfig(role) {
  return role === 'SUPERADMIN' || role === 'ADMIN';
}
