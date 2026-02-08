import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { hashPassword } from '../../lib/auth';

export async function POST(request) {
  try {
    const { secret, email, password, name } = await request.json();

    // Require SETUP_SECRET env var — no hardcoded fallback
    const setupSecret = process.env.SETUP_SECRET;
    if (!setupSecret) {
      return NextResponse.json({ error: 'SETUP_SECRET environment variable is not configured' }, { status: 500 });
    }

    if (!secret || secret !== setupSecret) {
      return NextResponse.json({ error: 'Invalid setup secret' }, { status: 403 });
    }

    // Check if a superadmin already exists
    const existing = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
    if (existing) {
      return NextResponse.json({ error: 'SuperAdmin already exists' }, { status: 409 });
    }

    // Require email, password, and name in request body
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        role: 'SUPERADMIN',
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({
      user,
      message: 'SuperAdmin created successfully. You can now log in.',
    }, { status: 201 });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
