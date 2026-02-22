import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, wallet } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const unique_id = searchParams.get('unique_id');

    if (!unique_id) {
      return NextResponse.json({ message: 'Missing unique_id' }, { status: 400 });
    }

    // Read balance from wallet table (single source of truth), NOT from users.wallet_balance
    const result = await db.select({ balance: wallet.balance })
      .from(wallet)
      .where(eq(wallet.userId, unique_id));

    if (result.length === 0) {
      return NextResponse.json({ wallet_balance: "0" });
    }

    return NextResponse.json({ wallet_balance: result[0].balance });
  } catch (error) {
    console.error('Balance Fetch Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
