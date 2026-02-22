import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages } from '@/lib/schema';
import { and, eq, isNotNull, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const unique_id = searchParams.get('unique_id');

    if (!unique_id) {
      return NextResponse.json(
        { message: 'Missing unique_id' },
        { status: 400 }
      );
    }

    // Only return rows that belong exactly to this user (isNotNull guards orphaned rows)
    const result = await db.select({
      user_message: messages.userMessage,
      llm_message: messages.llmMessage,
      created_at: messages.createdAt,
    })
    .from(messages)
    .where(
      and(
        eq(messages.uniqueId, unique_id),
        isNotNull(messages.uniqueId),
      )
    )
    .orderBy(asc(messages.createdAt));

    return NextResponse.json(result);

  } catch (error) {
    console.error('[chat/history] fetch error:', error);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}
