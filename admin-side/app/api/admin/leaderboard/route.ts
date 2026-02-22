import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await db.select({
      team_name: users.teamName,
      wallet_balance: users.walletBalance,
      unique_id: users.uniqueId
    })
    .from(users)
    .orderBy(desc(users.walletBalance))
    .limit(10);
    
    return NextResponse.json({ leaderboard: result });
  } catch (error) {
    console.error('Leaderboard Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
