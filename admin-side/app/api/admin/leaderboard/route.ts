import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, wallet } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Leaderboard reads live balances from the wallet table (single source of truth).
    // users.wallet_balance is intentionally ignored — it is stale and will be dropped.
    const result = await db
      .select({
        team_name: users.teamName,
        unique_id: users.uniqueId,
        wallet_balance: wallet.balance,
      })
      .from(users)
      .leftJoin(wallet, eq(wallet.userId, users.uniqueId))
      .where(eq(wallet.isMain, false))   // user wallets only (exclude main vault row)
      .orderBy(desc(wallet.balance))
      .limit(10);

    return NextResponse.json({ leaderboard: result });
  } catch (error) {
    console.error('Leaderboard Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
