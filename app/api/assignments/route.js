import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { getCurrentUser } from '../../lib/auth';
import { getWeekAssignments, generateCurrentWeekAssignments, getWeekStart, isCurrentWeek, getCurrentWeekStart, materializeWeek } from '../../lib/rotation';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get('week');
  const weekStart = weekParam ? getWeekStart(new Date(weekParam)) : getWeekStart();

  // For the current week, generate/persist assignments if they don't exist yet
  let assignments;
  if (isCurrentWeek(weekStart)) {
    assignments = await generateCurrentWeekAssignments();
  } else {
    assignments = await getWeekAssignments(weekStart);
  }

  // Filter out deactivated users from assignments
  const activeUserIds = new Set(
    (await prisma.user.findMany({ where: { active: true }, select: { id: true } }))
      .map(u => u.id)
  );
  assignments = assignments.filter(a => activeUserIds.has(a.userId));

  // Scholars only see their own assignments
  if (currentUser.role === 'SCHOLAR') {
    assignments = assignments.filter(a => a.userId === currentUser.id);
  }

  // Get config for chore days
  let config = await prisma.choreConfig.findFirst();
  if (!config) {
    config = await prisma.choreConfig.create({
      data: { timesPerWeek: 2, choreDays: '[1,4]' },
    });
  }

  // Get active chores separated by rotation type
  const allChores = await prisma.chore.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  });
  const weeklyChores = allChores.filter(c => c.rotationType === 'WEEKLY');
  const dailyChores = allChores.filter(c => c.rotationType === 'DAILY');

  // Get all scholars for daily rotation calculation
  const scholars = await prisma.user.findMany({
    where: { role: 'SCHOLAR', active: true },
    orderBy: { name: 'asc' },
  });

  // Calculate daily chore assignments (which day each scholar has each daily chore)
  // If fewer than 7 scholars, some get multiple days
  // If more than 7 scholars, some days have multiple people
  // Each week continues from where the previous week left off
  const dailyAssignments = [];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Calculate cumulative day offset using a fixed reference point (rotation state)
  // This ensures historical weeks show the same assignments they had when current
  const { getWeeksDiff, getWeekStart: getWeekStartFn } = await import('../../lib/rotation');
  
  // Get or create rotation state as the fixed reference point
  let rotationState = await prisma.rotationState.findFirst();
  if (!rotationState) {
    rotationState = await prisma.rotationState.create({
      data: { offset: 0, lastRotated: weekStart },
    });
  }
  
  const baseWeek = getWeekStartFn(rotationState.lastRotated);
  const weeksDiff = getWeeksDiff(baseWeek, weekStart);
  
  // Total days that have passed since base week (7 days per week)
  // This makes the rotation continuous and consistent across weeks
  const totalDaysOffset = weeksDiff * 7;

  // Fetch existing daily assignments for this week to get completion status
  // Only get daily chores (dayOfWeek 0-6, non-negative)
  const existingDailyAssignments = await prisma.choreAssignment.findMany({
    where: {
      weekStart,
      dayOfWeek: { gte: 0 }, // 0-6 for daily chores (not negative like weekly)
    },
  });
  // Create lookup map: choreId-userId-dayOfWeek -> assignment
  const dailyAssignmentMap = new Map();
  existingDailyAssignments.forEach(a => {
    dailyAssignmentMap.set(`${a.choreId}-${a.userId}-${a.dayOfWeek}`, a);
  });
  
  dailyChores.forEach((chore, choreIdx) => {
    const numScholars = scholars.length;
    
    if (numScholars === 0) return;
    
    // Assign all 7 days across scholars
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      // Calculate which scholar gets this day
      // Subtract totalDaysOffset to shift DOWN like weekly chores
      // This ensures continuity: each week the rotation shifts down
      const absoluteDayPosition = dayIdx - totalDaysOffset + (choreIdx * 3); // offset each chore slightly
      const scholarIdx = ((absoluteDayPosition % numScholars) + numScholars) % numScholars;
      const scholar = scholars[scholarIdx];
      
      // Check if there's an existing completion record
      const existingAssignment = dailyAssignmentMap.get(`${chore.id}-${scholar.id}-${dayIdx}`);
      
      dailyAssignments.push({
        id: existingAssignment?.id || `daily-${chore.id}-${scholar.id}-${dayIdx}`,
        chore: { id: chore.id, name: chore.name, description: chore.description, rotationType: 'DAILY' },
        user: { id: scholar.id, name: scholar.name },
        userId: scholar.id,
        choreId: chore.id,
        dayIndex: dayIdx,
        dayOfWeek: dayIdx,
        dayName: DAY_NAMES[dayIdx],
        isDaily: true,
        completed: existingAssignment?.completed || false,
      });
    }
  });

  // Admins can edit any week; scholars can only view
  const editable = currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN';
  const currentWeek = getCurrentWeekStart();

  // Filter daily assignments for scholars (they only see their own)
  const filteredDailyAssignments = currentUser.role === 'SCHOLAR'
    ? dailyAssignments.filter(d => d.userId === currentUser.id)
    : dailyAssignments;

  const response = NextResponse.json({
    assignments,
    dailyAssignments: filteredDailyAssignments,
    weekStart: weekStart.toISOString(),
    currentWeekStart: currentWeek.toISOString(),
    editable,
    config: {
      timesPerWeek: config.timesPerWeek,
      choreDays: JSON.parse(config.choreDays),
    },
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

// Mark assignment as completed (weekly or daily)
export async function PUT(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { assignmentId, completed, isDaily, choreId, userId, dayOfWeek, weekStart: reqWeekStart } = await request.json();

  // Handle daily chore completion
  if (isDaily) {
    // For daily chores, we need to create or update a ChoreAssignment with dayOfWeek
    if (!choreId || !userId || dayOfWeek === undefined || !reqWeekStart) {
      return NextResponse.json({ error: 'Missing required fields for daily chore completion' }, { status: 400 });
    }

    // Scholars can only update their own
    if (currentUser.role === 'SCHOLAR' && userId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const weekStartDate = new Date(reqWeekStart);

    // Find or create the daily assignment
    let assignment = await prisma.choreAssignment.findFirst({
      where: {
        choreId,
        userId,
        weekStart: weekStartDate,
        dayOfWeek,
      },
    });

    let pointsChange = 0;
    if (assignment) {
      // Update existing
      if (completed && !assignment.completed) {
        pointsChange = 10;
      } else if (!completed && assignment.completed) {
        pointsChange = -10;
      }

      const [updated] = await prisma.$transaction([
        prisma.choreAssignment.update({
          where: { id: assignment.id },
          data: { completed },
          include: {
            user: { select: { id: true, name: true, email: true, points: true } },
            chore: { select: { id: true, name: true } },
          },
        }),
        ...(pointsChange !== 0 ? [
          prisma.user.update({
            where: { id: userId },
            data: { points: { increment: pointsChange } },
          }),
        ] : []),
      ]);

      // Ensure points don't go below 0
      if (pointsChange < 0) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user && user.points < 0) {
          await prisma.user.update({
            where: { id: userId },
            data: { points: 0 },
          });
        }
      }

      return NextResponse.json({ assignment: updated, pointsAwarded: pointsChange > 0 ? pointsChange : 0 });
    } else {
      // Create new daily assignment
      if (completed) pointsChange = 10;

      // Find the max dayIndex for this user/week to set a unique one
      const maxDayIndex = await prisma.choreAssignment.aggregate({
        where: { userId, weekStart: weekStartDate },
        _max: { dayIndex: true },
      });
      const newDayIndex = (maxDayIndex._max.dayIndex ?? -1) + 1;

      const [created] = await prisma.$transaction([
        prisma.choreAssignment.create({
          data: {
            choreId,
            userId,
            weekStart: weekStartDate,
            dayOfWeek,
            dayIndex: newDayIndex,
            completed,
          },
          include: {
            user: { select: { id: true, name: true, email: true, points: true } },
            chore: { select: { id: true, name: true } },
          },
        }),
        ...(pointsChange !== 0 ? [
          prisma.user.update({
            where: { id: userId },
            data: { points: { increment: pointsChange } },
          }),
        ] : []),
      ]);

      return NextResponse.json({ assignment: created, pointsAwarded: pointsChange > 0 ? pointsChange : 0 });
    }
  }

  // Handle weekly chore completion (original logic)
  // Reject computed (non-persisted) assignment IDs
  if (!assignmentId || assignmentId.startsWith('computed-')) {
    return NextResponse.json(
      { error: 'This assignment is a future projection and cannot be modified. Only the current week can be updated.' },
      { status: 400 }
    );
  }

  const assignment = await prisma.choreAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Scholars can only update their own
  if (currentUser.role === 'SCHOLAR' && assignment.userId !== currentUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // If marking as completed and wasn't already, award 10 points
  // If unmarking as completed and was completed, deduct 10 points (but not below 0)
  let pointsChange = 0;
  if (completed && !assignment.completed) {
    pointsChange = 10;
  } else if (!completed && assignment.completed) {
    pointsChange = -10;
  }

  // Use a transaction to update both assignment and user points
  const [updated] = await prisma.$transaction([
    prisma.choreAssignment.update({
      where: { id: assignmentId },
      data: { completed },
      include: {
        user: { select: { id: true, name: true, email: true, points: true } },
        chore: { select: { id: true, name: true } },
      },
    }),
    ...(pointsChange !== 0 ? [
      prisma.user.update({
        where: { id: assignment.userId },
        data: { points: { increment: pointsChange } },
      }),
    ] : []),
  ]);

  // Ensure points don't go below 0
  if (pointsChange < 0) {
    const user = await prisma.user.findUnique({ where: { id: assignment.userId } });
    if (user && user.points < 0) {
      await prisma.user.update({
        where: { id: assignment.userId },
        data: { points: 0 },
      });
    }
  }

  return NextResponse.json({ assignment: updated, pointsAwarded: pointsChange > 0 ? pointsChange : 0 });
}

// Reassign a chore for a specific assignment (admin only)
export async function PATCH(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'SUPERADMIN' && currentUser.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { assignmentId, choreId, weekStart: patchWeekStart } = await request.json();

  if (!assignmentId) {
    return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
  }

  // If this is a computed (future) assignment, materialize the week first
  let realAssignmentId = assignmentId;
  if (assignmentId.startsWith('computed-')) {
    // Extract userId and weekStart from the computed ID format: computed-{userId}-{weekTimestamp}
    const parts = assignmentId.split('-');
    // Format: computed-{uuid parts}-{timestamp}
    // UUID has 5 parts separated by hyphens, so userId spans indices 1-5, timestamp is last
    const timestamp = parseInt(parts[parts.length - 1], 10);
    const userId = parts.slice(1, parts.length - 1).join('-');
    
    if (!timestamp || !userId) {
      return NextResponse.json({ error: 'Invalid computed assignment ID' }, { status: 400 });
    }

    const weekDate = new Date(timestamp);
    const materialized = await materializeWeek(weekDate);
    
    // Find the real assignment for this user in the materialized week
    const match = materialized.find(a => a.userId === userId);
    if (!match) {
      return NextResponse.json({ error: 'Could not find assignment for this user in the materialized week' }, { status: 404 });
    }
    realAssignmentId = match.id;
  }

  const assignment = await prisma.choreAssignment.findUnique({ where: { id: realAssignmentId } });
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Allow editing any week (including future), store as override
  // (rest of logic remains, but do not restrict to current week)
  // If a choreId is provided, verify it exists and is active
  if (choreId) {
    const chore = await prisma.chore.findUnique({ where: { id: choreId } });
    if (!chore || !chore.active) {
      return NextResponse.json({ error: 'Chore not found or inactive' }, { status: 404 });
    }

    // If this chore is already assigned to someone else this week, set ALL their weekly assignments to Free Day
    await prisma.choreAssignment.updateMany({
      where: {
        choreId: choreId,
        weekStart: assignment.weekStart,
        dayOfWeek: { lt: 0 }, // Only weekly assignments
      },
      data: { choreId: null, completed: false },
    });
  }

  // Update ALL of the target user's weekly assignments for this week (not just one)
  // This ensures the chore is assigned for all chore days (e.g., Monday AND Thursday)
  await prisma.choreAssignment.updateMany({
    where: { 
      userId: assignment.userId, 
      weekStart: assignment.weekStart,
      dayOfWeek: { lt: 0 }, // Only weekly assignments
    },
    data: { choreId: choreId || null, completed: choreId ? assignment.completed : false },
  });

  const updated = await prisma.choreAssignment.findUnique({
    where: { id: realAssignmentId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      chore: { select: { id: true, name: true, description: true } },
    },
  });

  return NextResponse.json({ assignment: updated });
}
