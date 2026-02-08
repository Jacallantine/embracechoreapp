import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getCurrentUser } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

// Get a scholar's chore history
export async function GET(request, { params }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can view other users' history
  const isAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN';
  const { id } = await params;

  if (!isAdmin && currentUser.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get the user
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      points: true,
      active: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get all assignments for this user, ordered by date (newest first)
  const assignments = await prisma.choreAssignment.findMany({
    where: { userId: id },
    include: {
      chore: {
        select: {
          id: true,
          name: true,
          description: true,
          active: true,
          rotationType: true,
        },
      },
    },
    orderBy: [
      { weekStart: 'desc' },
      { dayOfWeek: 'asc' },
    ],
  });

  // Get all bonus points for this user
  const bonusPointsRecords = await prisma.bonusPoints.findMany({
    where: { userId: id },
    include: {
      awardedBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group assignments by week for easier display
  const weeklyHistory = {};
  const dailyHistory = {};

  // Day names for display
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  assignments.forEach(a => {
    const weekKey = a.weekStart.toISOString().split('T')[0];
    
    if (a.dayOfWeek !== null && a.dayOfWeek >= 0) {
      // Daily chore (positive dayOfWeek: 0-6)
      if (!dailyHistory[weekKey]) {
        dailyHistory[weekKey] = [];
      }
      dailyHistory[weekKey].push({
        id: a.id,
        choreId: a.choreId,
        choreName: a.chore?.name || 'Unknown Chore',
        choreActive: a.chore?.active ?? true,
        dayOfWeek: a.dayOfWeek,
        dayName: DAY_NAMES[a.dayOfWeek],
        completed: a.completed,
        createdAt: a.createdAt,
      });
    } else if (a.dayOfWeek !== null && a.dayOfWeek < 0) {
      // Weekly chore with specific chore day (negative dayOfWeek: -1 = Sun, -2 = Mon, etc.)
      const actualDay = Math.abs(a.dayOfWeek) - 1; // Convert back: -2 -> 1 (Monday)
      if (!weeklyHistory[weekKey]) {
        weeklyHistory[weekKey] = [];
      }
      weeklyHistory[weekKey].push({
        id: a.id,
        choreId: a.choreId,
        choreName: a.chore?.name || (a.choreId ? 'Deleted Chore' : 'Free Day'),
        choreDescription: a.chore?.description,
        choreActive: a.chore?.active ?? true,
        choreDay: actualDay,
        choreDayName: DAY_NAMES[actualDay],
        completed: a.completed,
        createdAt: a.createdAt,
      });
    } else {
      // Old-style weekly chore (dayOfWeek: null) - backwards compatibility
      if (!weeklyHistory[weekKey]) {
        weeklyHistory[weekKey] = [];
      }
      weeklyHistory[weekKey].push({
        id: a.id,
        choreId: a.choreId,
        choreName: a.chore?.name || (a.choreId ? 'Deleted Chore' : 'Free Day'),
        choreDescription: a.chore?.description,
        choreActive: a.chore?.active ?? true,
        choreDay: null,
        choreDayName: null,
        completed: a.completed,
        createdAt: a.createdAt,
      });
    }
  });

  const response = NextResponse.json({
    user,
    weeklyHistory,
    dailyHistory,
    bonusPoints: bonusPointsRecords.map(bp => ({
      id: bp.id,
      points: bp.points,
      reason: bp.reason,
      awardedBy: bp.awardedBy.name,
      awardedById: bp.awardedBy.id,
      createdAt: bp.createdAt,
    })),
    canEdit: isAdmin,
  });

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

// Toggle completion status for an assignment
export async function PUT(request, { params }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can modify history
  const isAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { assignmentId, completed } = await request.json();

  if (!assignmentId) {
    return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
  }

  // Verify assignment belongs to this user
  const assignment = await prisma.choreAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  if (assignment.userId !== id) {
    return NextResponse.json({ error: 'Assignment does not belong to this user' }, { status: 400 });
  }

  // Calculate points change
  let pointsChange = 0;
  if (completed && !assignment.completed) {
    pointsChange = 10;
  } else if (!completed && assignment.completed) {
    pointsChange = -10;
  }

  // Update assignment and points in transaction
  const [updated] = await prisma.$transaction([
    prisma.choreAssignment.update({
      where: { id: assignmentId },
      data: { completed },
      include: {
        chore: { select: { id: true, name: true } },
      },
    }),
    ...(pointsChange !== 0 ? [
      prisma.user.update({
        where: { id },
        data: { points: { increment: pointsChange } },
      }),
    ] : []),
  ]);

  // Ensure points don't go below 0
  if (pointsChange < 0) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user && user.points < 0) {
      await prisma.user.update({
        where: { id },
        data: { points: 0 },
      });
    }
  }

  return NextResponse.json({
    assignment: updated,
    pointsChange,
  });
}

// Add bonus points
export async function POST(request, { params }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can add bonus points
  const isAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { points, reason } = await request.json();

  if (!points || typeof points !== 'number' || points === 0) {
    return NextResponse.json({ error: 'Points amount required (non-zero number)' }, { status: 400 });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({ error: 'Reason required' }, { status: 400 });
  }

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Create bonus points record and update user points in transaction
  const [bonusRecord] = await prisma.$transaction([
    prisma.bonusPoints.create({
      data: {
        userId: id,
        awardedById: currentUser.id,
        points,
        reason: reason.trim(),
      },
      include: {
        awardedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.user.update({
      where: { id },
      data: { points: { increment: points } },
    }),
  ]);

  // Ensure points don't go below 0
  const updatedUser = await prisma.user.findUnique({ where: { id } });
  if (updatedUser && updatedUser.points < 0) {
    await prisma.user.update({
      where: { id },
      data: { points: 0 },
    });
  }

  return NextResponse.json({
    bonusPoints: {
      id: bonusRecord.id,
      points: bonusRecord.points,
      reason: bonusRecord.reason,
      awardedBy: bonusRecord.awardedBy.name,
      createdAt: bonusRecord.createdAt,
    },
  }, { status: 201 });
}

// Delete bonus points
export async function DELETE(request, { params }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can delete bonus points
  const isAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const bonusId = searchParams.get('bonusId');

  if (!bonusId) {
    return NextResponse.json({ error: 'Bonus ID required' }, { status: 400 });
  }

  // Get the bonus record
  const bonusRecord = await prisma.bonusPoints.findUnique({
    where: { id: bonusId },
  });

  if (!bonusRecord) {
    return NextResponse.json({ error: 'Bonus record not found' }, { status: 404 });
  }

  if (bonusRecord.userId !== id) {
    return NextResponse.json({ error: 'Bonus record does not belong to this user' }, { status: 400 });
  }

  // Delete bonus and subtract points in transaction
  await prisma.$transaction([
    prisma.bonusPoints.delete({ where: { id: bonusId } }),
    prisma.user.update({
      where: { id },
      data: { points: { decrement: bonusRecord.points } },
    }),
  ]);

  // Ensure points don't go below 0
  const user = await prisma.user.findUnique({ where: { id } });
  if (user && user.points < 0) {
    await prisma.user.update({
      where: { id },
      data: { points: 0 },
    });
  }

  return NextResponse.json({ success: true });
}
