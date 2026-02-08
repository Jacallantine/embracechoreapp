import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { getCurrentUser, canManageConfig } from '../../lib/auth';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let config = await prisma.choreConfig.findFirst();
  if (!config) {
    config = await prisma.choreConfig.create({
      data: { timesPerWeek: 2, choreDays: '[1,4]' },
    });
  }

  return NextResponse.json({
    config: {
      id: config.id,
      timesPerWeek: config.timesPerWeek,
      choreDays: JSON.parse(config.choreDays),
    },
  });
}

export async function PUT(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageConfig(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { timesPerWeek, choreDays } = await request.json();

  if (timesPerWeek !== undefined && (timesPerWeek < 1 || timesPerWeek > 7)) {
    return NextResponse.json({ error: 'Times per week must be between 1 and 7' }, { status: 400 });
  }

  if (choreDays !== undefined) {
    if (!Array.isArray(choreDays) || choreDays.some(d => d < 0 || d > 6)) {
      return NextResponse.json({ error: 'Invalid chore days' }, { status: 400 });
    }
    if (timesPerWeek !== undefined && choreDays.length !== timesPerWeek) {
      return NextResponse.json({ error: 'Number of chore days must match times per week' }, { status: 400 });
    }
  }

  let config = await prisma.choreConfig.findFirst();
  if (!config) {
    config = await prisma.choreConfig.create({
      data: { timesPerWeek: 2, choreDays: '[1,4]' },
    });
  }

  const updated = await prisma.choreConfig.update({
    where: { id: config.id },
    data: {
      ...(timesPerWeek !== undefined && { timesPerWeek }),
      ...(choreDays !== undefined && { choreDays: JSON.stringify(choreDays) }),
    },
  });

  return NextResponse.json({
    config: {
      id: updated.id,
      timesPerWeek: updated.timesPerWeek,
      choreDays: JSON.parse(updated.choreDays),
    },
  });
}
