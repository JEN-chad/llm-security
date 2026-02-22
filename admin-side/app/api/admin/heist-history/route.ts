import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { heistHistory } from '@/lib/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await db.select({
      id: heistHistory.id,
      unique_id: heistHistory.uniqueId,
      team_name: heistHistory.teamName,
      money_taken: heistHistory.moneyTaken,
      bank_balance_after: heistHistory.bankBalanceAfter,
      created_at: heistHistory.createdAt,
    })
    .from(heistHistory)
    .orderBy(desc(heistHistory.id))
    .limit(10);

    return NextResponse.json({ history: result });
  } catch (error) {
    console.error('Heist History Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
