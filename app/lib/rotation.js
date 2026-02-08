import prisma from './prisma';

/**
 * Get the Monday (start) of a given week in UTC
 */
export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the current week's Monday (based on actual today's date)
 */
export function getCurrentWeekStart() {
  return getWeekStart(new Date());
}

/**
 * Calculate weeks difference between two dates
 */
export function getWeeksDiff(fromDate, toDate) {
  const from = getWeekStart(fromDate);
  const to = getWeekStart(toDate);
  return Math.round((to.getTime() - from.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Generate or fetch assignments for the CURRENT week only.
 * This is the only week that gets stored in the database.
 * Uses a transaction to prevent race conditions.
 * Creates one assignment per chore day (from config) for weekly chores.
 */
export async function generateCurrentWeekAssignments() {
  const weekStart = getCurrentWeekStart();

  // Get active scholars sorted by name
  const scholars = await prisma.user.findMany({
    where: { role: 'SCHOLAR', active: true },
    orderBy: { name: 'asc' },
  });

  // Get active WEEKLY chores sorted by sortOrder
  const chores = await prisma.chore.findMany({
    where: { active: true, rotationType: 'WEEKLY' },
    orderBy: { sortOrder: 'asc' },
  });

  // Get config for chore days
  let config = await prisma.choreConfig.findFirst();
  if (!config) {
    config = await prisma.choreConfig.create({
      data: { timesPerWeek: 2, choreDays: '[1,4]' },
    });
  }
  const choreDays = JSON.parse(config.choreDays); // e.g., [1, 4] for Mon, Thu

  if (scholars.length === 0) return [];

  // Use a transaction to avoid race conditions
  return await prisma.$transaction(async (tx) => {
    // Check if weekly assignments already exist for the current week
    // Weekly chores now use negative dayOfWeek (-1, -2, etc.) to distinguish from daily chores
    // Also check for old-style assignments (dayOfWeek: null)
    const existing = await tx.choreAssignment.findMany({
      where: { 
        weekStart, 
        OR: [
          { dayOfWeek: { lt: 0 } }, // New style: negative dayOfWeek
          { dayOfWeek: null }, // Old style: null dayOfWeek
        ]
      },
    });

    // Separate new-style and old-style assignments
    const newStyleAssignments = existing.filter(a => a.dayOfWeek !== null && a.dayOfWeek < 0);
    const oldStyleAssignments = existing.filter(a => a.dayOfWeek === null);

    // If there are old-style assignments, delete only the incomplete ones (preserve completed history)
    if (oldStyleAssignments.length > 0) {
      await tx.choreAssignment.deleteMany({ 
        where: { weekStart, dayOfWeek: null, completed: false } 
      });
    }

    // Build a map of existing assignments by oderId-dayOfWeek for quick lookup
    const existingMap = new Map();
    newStyleAssignments.forEach(a => {
      existingMap.set(`${a.userId}-${a.dayOfWeek}`, a);
    });

    // Check what assignments we need to create for current config
    const neededAssignments = [];
    const existingForCurrentConfig = [];

    // Get or create rotation state first (needed for chore assignment calculation)
    let rotationState = await tx.rotationState.findFirst();
    if (!rotationState) {
      rotationState = await tx.rotationState.create({
        data: { offset: 0, lastRotated: weekStart },
      });
    }

    // Compute offset for current week
    const referenceWeek = getWeekStart(rotationState.lastRotated);
    const weeksDiff = getWeeksDiff(referenceWeek, weekStart);
    const offset = rotationState.offset + weeksDiff;

    // Determine what assignments are needed for the current config
    for (let i = 0; i < scholars.length; i++) {
      const scholar = scholars[i];
      const choreIndex = ((i + offset) % scholars.length + scholars.length) % scholars.length;
      const chore = choreIndex < chores.length ? chores[choreIndex] : null;

      choreDays.forEach((choreDay, dayIdx) => {
        const dayOfWeek = -(choreDay + 1); // Convert to negative storage format
        const key = `${scholar.id}-${dayOfWeek}`;
        const existingAssignment = existingMap.get(key);

        if (existingAssignment) {
          // Assignment exists for this day - keep it
          existingForCurrentConfig.push(existingAssignment);
        } else {
          // Need to create assignment for this day
          neededAssignments.push({
            userId: scholar.id,
            choreId: chore?.id || null,
            weekStart,
            dayIndex: dayIdx,
            dayOfWeek,
            completed: false,
          });
        }
      });
    }

    // Delete incomplete assignments that are NOT in the current config
    // (but keep completed ones for history)
    const currentConfigDays = new Set(choreDays.map(d => -(d + 1)));
    const toDelete = newStyleAssignments.filter(a => 
      !currentConfigDays.has(a.dayOfWeek) && !a.completed
    );
    if (toDelete.length > 0) {
      await tx.choreAssignment.deleteMany({
        where: { 
          id: { in: toDelete.map(a => a.id) }
        }
      });
    }

    // Create any missing assignments (skipDuplicates handles race conditions)
    if (neededAssignments.length > 0) {
      await tx.choreAssignment.createMany({ 
        data: neededAssignments,
        skipDuplicates: true,
      });
    }

    // Return all weekly assignments for this week (both current config and completed history)
    return tx.choreAssignment.findMany({
      where: { weekStart, dayOfWeek: { lt: 0 } },
      include: { 
        user: { select: { id: true, name: true, email: true, role: true } }, 
        chore: { select: { id: true, name: true, description: true, active: true } } 
      },
      orderBy: [{ user: { name: 'asc' } }, { dayOfWeek: 'desc' }],
    });
  });
}

/**
 * Get assignments for any week.
 * - If stored in DB, return from DB
 * - Otherwise, find the most recent stored week and rotate forward from those
 *   actual assignments. This means manual changes cascade into future weeks.
 */
export async function getWeekAssignments(targetDate) {
  const targetWeek = getWeekStart(targetDate);

  // If week is stored, return it directly (weekly chores have negative dayOfWeek)
  const storedAssignments = await prisma.choreAssignment.findMany({
    where: { weekStart: targetWeek, dayOfWeek: { lt: 0 } },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      chore: { select: { id: true, name: true, description: true, active: true } },
    },
    orderBy: [{ user: { name: 'asc' } }, { dayOfWeek: 'desc' }],
  });
  if (storedAssignments.length > 0) return storedAssignments;

  // Also check for old-style assignments (dayOfWeek: null) for backwards compatibility
  const oldStyleAssignments = await prisma.choreAssignment.findMany({
    where: { weekStart: targetWeek, dayOfWeek: null },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      chore: { select: { id: true, name: true, description: true, active: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });
  if (oldStyleAssignments.length > 0) return oldStyleAssignments;

  // Get active scholars and chores
  const scholars = await prisma.user.findMany({
    where: { role: 'SCHOLAR', active: true },
    orderBy: { name: 'asc' },
  });

  const chores = await prisma.chore.findMany({
    where: { active: true, rotationType: 'WEEKLY' },
    orderBy: { sortOrder: 'asc' },
  });

  if (scholars.length === 0) return [];

  // Find the most recent stored week <= target to use as reference
  const mostRecentWeek = await prisma.choreAssignment.findFirst({
    where: { 
      weekStart: { lte: targetWeek }, 
      OR: [
        { dayOfWeek: { lt: 0 } },
        { dayOfWeek: null }
      ]
    },
    select: { weekStart: true },
    orderBy: { weekStart: 'desc' },
  });

  if (!mostRecentWeek) {
    // No stored weeks at all — fall back to rotation state
    const rotationState = await prisma.rotationState.findFirst();
    if (!rotationState) return [];

    const referenceWeek = getWeekStart(rotationState.lastRotated);
    const weeksDiff = getWeeksDiff(referenceWeek, targetWeek);
    const offset = rotationState.offset + weeksDiff;

    return scholars.map((scholar, i) => {
      const choreIndex = ((i + offset) % scholars.length + scholars.length) % scholars.length;
      const chore = choreIndex < chores.length ? chores[choreIndex] : null;
      return {
        id: `computed-${scholar.id}-${targetWeek.getTime()}`,
        userId: scholar.id,
        user: { id: scholar.id, name: scholar.name, email: scholar.email, role: scholar.role },
        choreId: chore?.id || null,
        chore: chore ? { id: chore.id, name: chore.name, description: chore.description } : null,
        weekStart: targetWeek,
        completed: false,
        isComputed: true,
      };
    });
  }

  const refWeek = mostRecentWeek.weekStart;
  const refAssignments = await prisma.choreAssignment.findMany({
    where: { weekStart: refWeek, dayOfWeek: null },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      chore: { select: { id: true, name: true, description: true, active: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const weeksDiff = getWeeksDiff(refWeek, targetWeek);
  const numScholars = scholars.length;

  // Build a slot array from the reference week:
  // slots[scholarIndex] = choreId or null
  // We map by scholar sort order, matching refAssignments to current scholar list
  const scholarIdToIndex = new Map(scholars.map((s, i) => [s.id, i]));
  const slots = new Array(numScholars).fill(null);
  for (const a of refAssignments) {
    const idx = scholarIdToIndex.get(a.userId);
    if (idx !== undefined) {
      slots[idx] = a.choreId;
    }
  }

  // Rotate: each week, chores shift down by 1 position.
  // Scholar at index j in the target week gets the chore from
  // slot (j - weeksDiff) in the reference week.
  return scholars.map((scholar, j) => {
    const sourceSlot = ((j - weeksDiff) % numScholars + numScholars) % numScholars;
    const choreId = slots[sourceSlot];
    const chore = choreId ? chores.find(c => c.id === choreId) || null : null;
    // If the chore was deactivated since, treat as null
    return {
      id: `computed-${scholar.id}-${targetWeek.getTime()}`,
      userId: scholar.id,
      user: { id: scholar.id, name: scholar.name, email: scholar.email, role: scholar.role },
      choreId: chore ? chore.id : null,
      chore: chore ? { id: chore.id, name: chore.name, description: chore.description } : null,
      weekStart: targetWeek,
      completed: false,
      isComputed: true,
    };
  });
}

/**
 * Materialize a computed future week into the database so it can be edited.
 * Computes the assignments the same way getWeekAssignments does, then stores them.
 * Returns the stored assignments.
 */
export async function materializeWeek(targetDate) {
  const targetWeek = getWeekStart(targetDate);

  // If already stored, return existing (weekly chores have negative dayOfWeek)
  const existing = await prisma.choreAssignment.findMany({
    where: { 
      weekStart: targetWeek, 
      OR: [
        { dayOfWeek: { lt: 0 } },
        { dayOfWeek: null }
      ]
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      chore: { select: { id: true, name: true, description: true, active: true } },
    },
    orderBy: [{ user: { name: 'asc' } }, { dayOfWeek: 'desc' }],
  });
  if (existing.length > 0) return existing;

  // Get config for chore days
  let config = await prisma.choreConfig.findFirst();
  if (!config) {
    config = await prisma.choreConfig.create({
      data: { timesPerWeek: 2, choreDays: '[1,4]' },
    });
  }
  const choreDays = JSON.parse(config.choreDays);

  // Get the computed assignments
  const computed = await getWeekAssignments(targetDate);
  if (computed.length === 0) return [];

  // Store them with chore day info
  const assignments = [];
  for (const a of computed) {
    choreDays.forEach((choreDay, dayIdx) => {
      assignments.push({
        userId: a.userId,
        choreId: a.choreId,
        weekStart: targetWeek,
        dayIndex: dayIdx,
        dayOfWeek: -(choreDay + 1),
        completed: false,
      });
    });
  }

  await prisma.choreAssignment.createMany({ data: assignments });

  return prisma.choreAssignment.findMany({
    where: { weekStart: targetWeek, dayOfWeek: { lt: 0 } },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      chore: { select: { id: true, name: true, description: true, active: true } },
    },
    orderBy: [{ user: { name: 'asc' } }, { dayOfWeek: 'desc' }],
  });
}

/**
 * Check if a week is the current week (editable) or not
 */
export function isCurrentWeek(targetDate) {
  const targetWeek = getWeekStart(targetDate);
  const currentWeek = getCurrentWeekStart();
  return targetWeek.getTime() === currentWeek.getTime();
}
