import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bankBalance, globalStats } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [bankResult, statsResult] = await Promise.all([
      db.select({ total_balance: bankBalance.totalBalance }).from(bankBalance).limit(1),
      db.select({ security_level: globalStats.securityLevel }).from(globalStats).limit(1),
    ]);

    const total = bankResult[0]?.total_balance || 0;
    const securityLevel = statsResult[0]?.security_level ?? 1;

    return NextResponse.json({
      total: parseInt(String(total), 10),
      security_level: securityLevel,
    });
  } catch (error) {
    console.error('Stats Error:', error);
    return NextResponse.json({ total: 0, security_level: 1 });
  }
}

export async function POST(req: Request) {
  try {
    const { security_level } = await req.json();

    const level = Math.max(1, Math.min(5, Number(security_level)));

    // Check if a row exists
    const existing = await db.select().from(globalStats).limit(1);

    if (existing.length > 0) {
      await db.update(globalStats)
        .set({ securityLevel: level })
        .where(eq(globalStats.id, existing[0].id));
    } else {
      await db.insert(globalStats).values({ securityLevel: level });
    }

    return NextResponse.json({ security_level: level });
  } catch (error) {
    console.error('Security Level Update Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
