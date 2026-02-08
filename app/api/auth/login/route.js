import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { verifyPassword, signToken } from '../../../lib/auth';
import { checkRateLimit } from '../../../lib/rateLimit';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Rate limit by email (normalize to lowercase)
    const rateLimitKey = `login:${email.toLowerCase().trim()}`;
    const { allowed, retryAfterMs } = checkRateLimit(rateLimitKey, {
      maxAttempts: 5,
      windowMs: 15 , // 15 minutes
    });

    if (!allowed) {
      const retryMinutes = Math.ceil(retryAfterMs / 60000);
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''}.` },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ userId: user.id, role: user.role });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
