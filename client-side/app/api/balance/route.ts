import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const unique_id = searchParams.get('unique_id');

    if (!unique_id) {
      return NextResponse.json({ message: 'Missing unique_id' }, { status: 400 });
    }

    const result = await db.select({ wallet_balance: users.walletBalance })
      .from(users)
      .where(eq(users.uniqueId, unique_id));

    if (result.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ wallet_balance: result[0].wallet_balance });
  } catch (error) {
    console.error('Balance Fetch Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
