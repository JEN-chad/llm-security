import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminControl } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await db.select({ allow_signin: adminControl.allowSignin })
      .from(adminControl)
      .limit(1);

    return NextResponse.json({ allow_signin: result[0]?.allow_signin ?? false });
  } catch (error) {
    console.error('Status Check Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
