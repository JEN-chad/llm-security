import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, wallet, bankBalance, heistHistory } from '@/lib/schema';
import { eq, sum } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const unique_id = searchParams.get('unique_id');

    if (!unique_id) {
      return NextResponse.json({ message: 'Missing unique_id' }, { status: 400 });
    }

    // Verify user exists
    const userRows = await db
      .select({ uniqueId: users.uniqueId })
      .from(users)
      .where(eq(users.uniqueId, unique_id));

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Read user wallet balance from wallet table (single source of truth)
    const walletRows = await db
      .select({ balance: wallet.balance })
      .from(wallet)
      .where(eq(wallet.userId, unique_id));

    const user_wallet = walletRows.length > 0 ? walletRows[0].balance : "0";

    // Parallel queries for bank balance and per-user plundered total
    const [bankResult, plunderedResult] = await Promise.all([
      db.select({ total_balance: bankBalance.totalBalance }).from(bankBalance).limit(1),
      db.select({ total_plundered: sum(heistHistory.moneyTaken) })
        .from(heistHistory)
        .where(eq(heistHistory.uniqueId, unique_id))
    ]);

    const bank_balance = bankResult[0]?.total_balance || 0;
    const total_plundered = plunderedResult[0]?.total_plundered || 0;

    return NextResponse.json({
      wallet_balance: Number(bank_balance),       // global bank (shared)
      user_wallet: Number(user_wallet),           // individual wallet from wallet table
      total_plundered: Number(total_plundered),   // per-user plundered
    });

  } catch (error) {
    console.error('User Stats Fetch Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
