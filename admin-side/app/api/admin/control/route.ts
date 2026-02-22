import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminControl } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await db.select({ allow_signin: adminControl.allowSignin })
      .from(adminControl)
      .limit(1);

    return NextResponse.json({ allow_signin: result[0]?.allow_signin ?? false });
  } catch (error) {
    console.error('Admin Control Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { allow_signin } = await req.json();

    if (typeof allow_signin !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    // Try to update existing first
    const updated = await db.update(adminControl)
      .set({ allowSignin: allow_signin })
      .returning({ allow_signin: adminControl.allowSignin });

    if (updated.length > 0) {
      return NextResponse.json({ allow_signin: updated[0].allow_signin });
    }

    // If no row exists, insert with a default uniqueId (since schema requires it)
    // We'll use a fixed ID for the singleton control row
    const inserted = await db.insert(adminControl)
      .values({ 
        uniqueId: 'admin_settings', 
        allowSignin: allow_signin 
      })
      .returning({ allow_signin: adminControl.allowSignin });
      
    return NextResponse.json({ allow_signin: inserted[0].allow_signin });

  } catch (error) {
    console.error('Admin Control Update Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
