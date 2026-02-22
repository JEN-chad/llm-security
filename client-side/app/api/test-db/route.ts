import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const duration = Date.now() - start;

    return NextResponse.json({ 
      message: 'Database connection successful', 
      timestamp: new Date().toISOString(),
      latency: `${duration}ms`
    }, { status: 200 });

  } catch (error) {
    console.error('Database connection failed:', error);
    return NextResponse.json({ 
      message: 'Database connection failed', 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
