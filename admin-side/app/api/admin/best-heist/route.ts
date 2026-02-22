import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { heistHistory } from '@/lib/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await db.select({
      team_name: heistHistory.teamName,
      money_taken: heistHistory.moneyTaken,
      user_message: heistHistory.userMessage,
      bank_balance_after: heistHistory.bankBalanceAfter,
      unique_id: heistHistory.uniqueId,
      created_at: heistHistory.createdAt,
    })
    .from(heistHistory)
    .orderBy(desc(heistHistory.moneyTaken))
    .limit(1);

    if (result.length === 0) {
        return NextResponse.json({ bestHeist: null });
    }

    return NextResponse.json({ bestHeist: result[0] });
  } catch (error) {
    console.error('Best Heist Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

