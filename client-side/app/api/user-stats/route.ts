import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, bankBalance, heistHistory } from '@/lib/schema';
import { eq, sum } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const unique_id = searchParams.get('unique_id');

    if (!unique_id) {
      return NextResponse.json({ message: 'Missing unique_id' }, { status: 400 });
    }

    // User check first
    const userRows = await db.select({
      walletBalance: users.walletBalance,
    }).from(users).where(eq(users.uniqueId, unique_id));
    
    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Parallel queries for bank balance and per-user plundered total
    const [bankResult, plunderedResult] = await Promise.all([
      db.select({ total_balance: bankBalance.totalBalance }).from(bankBalance).limit(1),
      db.select({ total_plundered: sum(heistHistory.moneyTaken) })
        .from(heistHistory)
        .where(eq(heistHistory.uniqueId, unique_id))
    ]);

    const bank_balance = bankResult[0]?.total_balance || 0;
    // Per-user plundered: sum of all heists by this user (starts at 0 for new users)
    const total_plundered = plunderedResult[0]?.total_plundered || 0;
    // User's individual wallet balance
    const user_wallet = userRows[0]?.walletBalance || 0;

    return NextResponse.json({ 
        wallet_balance: Number(bank_balance),       // global bank (shared)
        user_wallet: Number(user_wallet),           // individual wallet
        total_plundered: Number(total_plundered),   // per-user plundered (starts at 0)
    });

  } catch (error) {
    console.error('User Stats Fetch Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

