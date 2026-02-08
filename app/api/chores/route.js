import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { getCurrentUser, canManageChores } from '../../lib/auth';
import { validateChoreName, validateDescription, sanitize } from '../../lib/validation';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chores = await prisma.chore.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({ chores });
}

export async function POST(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageChores(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, description, rotationType } = await request.json();

  const nameErr = validateChoreName(name);
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });

  const descErr = validateDescription(description);
  if (descErr) return NextResponse.json({ error: descErr }, { status: 400 });

  // Validate rotationType if provided
  if (rotationType && !['WEEKLY', 'DAILY'].includes(rotationType)) {
    return NextResponse.json({ error: 'Invalid rotation type. Use "WEEKLY" or "DAILY"' }, { status: 400 });
  }

  // Check weekly chore count vs scholar count (daily chores don't count against this limit)
  // Only weekly chores need to be <= scholars since each scholar gets one weekly chore
  if (rotationType !== 'DAILY') {
    const weeklyChoreCount = await prisma.chore.count({ where: { active: true, rotationType: 'WEEKLY' } });
    const scholarCount = await prisma.user.count({ where: { role: 'SCHOLAR', active: true } });

    if (weeklyChoreCount >= scholarCount) {
      return NextResponse.json({
        error: `Cannot have more weekly chores than scholars. Currently ${scholarCount} scholars and ${weeklyChoreCount} weekly chores.`,
      }, { status: 400 });
    }
  }

  const maxOrder = await prisma.chore.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const chore = await prisma.chore.create({
    data: { 
      name: sanitize(name), 
      description: description ? sanitize(description) : null, 
      rotationType: rotationType || 'WEEKLY',
      sortOrder 
    },
  });

  // Auto-assign this new chore to a scholar who currently has a free day this week
  try {
    const { getCurrentWeekStart } = await import('../../lib/rotation');
    const weekStart = getCurrentWeekStart();
    const freeAssignment = await prisma.choreAssignment.findFirst({
      where: { weekStart, choreId: null },
      orderBy: { user: { name: 'asc' } },
    });
    if (freeAssignment) {
      await prisma.choreAssignment.update({
        where: { id: freeAssignment.id },
        data: { choreId: chore.id },
      });
    }
  } catch (e) {
    // Non-critical — assignments will catch up on next dashboard load
    console.error('Auto-assign failed:', e);
  }

  return NextResponse.json({ chore }, { status: 201 });
}

export async function PUT(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageChores(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, name, description, sortOrder, rotationType } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'Chore ID required' }, { status: 400 });
  }

  // Validate rotationType if provided
  if (rotationType && !['WEEKLY', 'DAILY'].includes(rotationType)) {
    return NextResponse.json({ error: 'Invalid rotation type. Use "WEEKLY" or "DAILY"' }, { status: 400 });
  }

  const chore = await prisma.chore.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(rotationType !== undefined && { rotationType }),
    },
  });

  return NextResponse.json({ chore });
}

export async function DELETE(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageChores(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const choreId = searchParams.get('id');

  if (!choreId) {
    return NextResponse.json({ error: 'Chore ID required' }, { status: 400 });
  }

  await prisma.chore.update({
    where: { id: choreId },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
