import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { getCurrentUser } from '../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month'); // Format: YYYY-MM
  
  // Default to current month
  const now = new Date();
  let year, month;
  
  if (monthParam) {
    const [y, m] = monthParam.split('-').map(Number);
    year = y;
    month = m;
  } else {
    year = now.getFullYear();
    month = now.getMonth() + 1; // 1-indexed
  }

  // Calculate month boundaries
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  // Get all scholars
  const scholars = await prisma.user.findMany({
    where: { role: 'SCHOLAR', active: true },
    select: {
      id: true,
      name: true,
      points: true,
    },
    orderBy: { name: 'asc' },
  });

  // Count completed assignments for this month for each scholar
  // This includes both weekly and daily chores completed within the month
  const completionCounts = await prisma.choreAssignment.groupBy({
    by: ['userId'],
    where: {
      completed: true,
      createdAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    _count: {
      id: true,
    },
  });

  // Get bonus points for this month
  const bonusPointsRecords = await prisma.bonusPoints.groupBy({
    by: ['userId'],
    where: {
      createdAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    _sum: {
      points: true,
    },
  });

  // Create a map of userId -> completions this month
  const completionsMap = new Map();
  completionCounts.forEach(c => {
    completionsMap.set(c.userId, c._count.id);
  });

  // Create a map of userId -> bonus points this month
  const bonusMap = new Map();
  bonusPointsRecords.forEach(b => {
    bonusMap.set(b.userId, b._sum.points || 0);
  });

  // Calculate points earned this month (10 points per completion + bonus points)
  const leaderboard = scholars.map(scholar => {
    const chorePoints = (completionsMap.get(scholar.id) || 0) * 10;
    const bonusPoints = bonusMap.get(scholar.id) || 0;
    return {
      id: scholar.id,
      name: scholar.name,
      totalPoints: scholar.points,
      monthlyCompletions: completionsMap.get(scholar.id) || 0,
      monthlyBonusPoints: bonusPoints,
      monthlyPoints: chorePoints + bonusPoints,
    };
  });

  // Sort by monthly points (descending), then by name
  leaderboard.sort((a, b) => {
    if (b.monthlyPoints !== a.monthlyPoints) {
      return b.monthlyPoints - a.monthlyPoints;
    }
    return a.name.localeCompare(b.name);
  });

  // Add rank
  let currentRank = 1;
  let previousPoints = null;
  leaderboard.forEach((entry, index) => {
    if (previousPoints !== null && entry.monthlyPoints < previousPoints) {
      currentRank = index + 1;
    }
    entry.rank = currentRank;
    previousPoints = entry.monthlyPoints;
  });

  const response = NextResponse.json({
    leaderboard,
    month: { year, month },
    monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  });
  
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
