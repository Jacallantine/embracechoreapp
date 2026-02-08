import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { getCurrentUser, canManageUsers, canManageAdmins, hashPassword } from '../../lib/auth';
import { validateEmail, validatePassword, validateName, validateRole, sanitize } from '../../lib/validation';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let where = { active: true };

  // Admins can only see scholars
  if (currentUser.role === 'ADMIN') {
    where.role = 'SCHOLAR';
  }
  // Scholars can't list users
  if (currentUser.role === 'SCHOLAR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true, role: true, points: true, active: true, createdAt: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ users });
}

export async function POST(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageUsers(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email, password, name, role } = await request.json();

  // Validate all inputs
  const emailErr = validateEmail(email);
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

  const passwordErr = validatePassword(password);
  if (passwordErr) return NextResponse.json({ error: passwordErr }, { status: 400 });

  const nameErr = validateName(name);
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });

  const roleErr = validateRole(role);
  if (roleErr) return NextResponse.json({ error: roleErr }, { status: 400 });

  // Admins cannot create other admins or superadmins
  if (currentUser.role === 'ADMIN' && (role === 'ADMIN' || role === 'SUPERADMIN')) {
    return NextResponse.json({ error: 'You cannot create admin accounts' }, { status: 403 });
  }

  // Only superadmin can create admins
  if (role === 'ADMIN' && !canManageAdmins(currentUser.role)) {
    return NextResponse.json({ error: 'Only SuperAdmin can create admins' }, { status: 403 });
  }

  if (role === 'SUPERADMIN') {
    return NextResponse.json({ error: 'Cannot create SuperAdmin accounts' }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: sanitize(email).toLowerCase(),
      password: hashedPassword,
      name: sanitize(name),
      role,
    },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}

export async function DELETE(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageUsers(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  if (userId === currentUser.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Admins can't delete other admins or superadmins
  if (currentUser.role === 'ADMIN' && targetUser.role !== 'SCHOLAR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}

// Update user points (SUPERADMIN only)
export async function PATCH(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (currentUser.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Only SuperAdmin can modify points' }, { status: 403 });
  }

  const { userId, points, action } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  if (typeof points !== 'number' || points < 0) {
    return NextResponse.json({ error: 'Points must be a non-negative number' }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let newPoints;
  if (action === 'set') {
    newPoints = points;
  } else if (action === 'add') {
    newPoints = targetUser.points + points;
  } else if (action === 'subtract') {
    newPoints = Math.max(0, targetUser.points - points);
  } else {
    return NextResponse.json({ error: 'Invalid action. Use "set", "add", or "subtract"' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { points: newPoints },
    select: { id: true, name: true, points: true },
  });

  return NextResponse.json({ user: updated });
}
