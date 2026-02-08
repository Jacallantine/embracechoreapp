import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getCurrentUser, verifyPassword, hashPassword } from '../../../lib/auth';

export async function PUT(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 });
    }

    // Fetch user with password hash
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }

    // Hash and save new password
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
