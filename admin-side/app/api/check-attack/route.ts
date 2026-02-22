import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { heistHistory } from '@/lib/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await db.select({
      id: heistHistory.id,
      money_taken: heistHistory.moneyTaken,
      unique_id: heistHistory.uniqueId,
      team_name: heistHistory.teamName,
      bank_balance_after: heistHistory.bankBalanceAfter,
      created_at: heistHistory.createdAt,
    })
    .from(heistHistory)
    .orderBy(desc(heistHistory.id))
    .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ attack: null });
    }

    return NextResponse.json({ attack: result[0] });
  } catch (error) {
    console.error('Check Attack Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
