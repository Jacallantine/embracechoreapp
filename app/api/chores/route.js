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

  // Auto-assign this new WEEKLY chore to a scholar who doesn't have one this week
  // Daily chores are computed on-the-fly and don't need assignment records
  if (chore.rotationType === 'WEEKLY') {
    try {
      const { getCurrentWeekStart } = await import('../../lib/rotation');
      const weekStart = getCurrentWeekStart();
      
      // Get config for chore days
      let config = await prisma.choreConfig.findFirst();
      if (!config) {
        config = await prisma.choreConfig.create({
          data: { timesPerWeek: 2, choreDays: '[1,4]' },
        });
      }
      const choreDays = JSON.parse(config.choreDays);
      
      // Get all scholars
      const scholars = await prisma.user.findMany({
        where: { role: 'SCHOLAR', active: true },
        orderBy: { name: 'asc' },
      });
      
      // Get all weekly assignments for this week
      const existingAssignments = await prisma.choreAssignment.findMany({
        where: { weekStart, dayOfWeek: { lt: 0 } },
      });
      
      // Build a map of userId -> choreId (first non-null choreId found, or null)
      const userChoreMap = new Map();
      for (const a of existingAssignments) {
        if (!userChoreMap.has(a.userId)) {
          userChoreMap.set(a.userId, a.choreId);
        } else if (a.choreId && !userChoreMap.get(a.userId)) {
          userChoreMap.set(a.userId, a.choreId);
        }
      }
      
      // Find a scholar without a chore this week
      const scholarWithoutChore = scholars.find(s => {
        const choreId = userChoreMap.get(s.id);
        return choreId === null || choreId === undefined;
      });
      
      if (scholarWithoutChore) {
        // Check if they have existing assignment slots (with choreId: null)
        const existingSlotsForUser = existingAssignments.filter(
          a => a.userId === scholarWithoutChore.id
        );
        
        if (existingSlotsForUser.length > 0) {
          // Update existing free slots
          await prisma.choreAssignment.updateMany({
            where: { 
              weekStart, 
              userId: scholarWithoutChore.id, 
              dayOfWeek: { lt: 0 } 
            },
            data: { choreId: chore.id },
          });
        } else {
          // Create new assignment slots
          const newAssignments = choreDays.map((choreDay, dayIdx) => ({
            userId: scholarWithoutChore.id,
            choreId: chore.id,
            weekStart,
            dayIndex: dayIdx,
            dayOfWeek: -(choreDay + 1),
            completed: false,
          }));
          
          await prisma.choreAssignment.createMany({ 
            data: newAssignments,
            skipDuplicates: true,
          });
        }
      }
    } catch (e) {
      // Non-critical — assignments will catch up on next dashboard load
      console.error('Auto-assign failed:', e);
    }
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

  // Soft-delete the chore
  await prisma.chore.update({
    where: { id: choreId },
    data: { active: false },
  });

  // Clear this chore from all assignments so it doesn't show up in schedules
  await prisma.choreAssignment.updateMany({
    where: { choreId },
    data: { choreId: null },
  });

  return NextResponse.json({ success: true });
}
