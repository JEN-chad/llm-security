import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, adminControl } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { team_name, member1, member2, unique_id } = await req.json();

    // 🔒 Check Admin Control
    const controlCheck = await db.select({ allow_signin: adminControl.allowSignin })
      .from(adminControl)
      .limit(1);

    if (controlCheck.length > 0 && !controlCheck[0].allow_signin) {
       return NextResponse.json(
         { message: 'System Locked: Sign-in is currently disabled by Admin.' },
         { status: 403 }
       );
    }

    const result = await db.select()
      .from(users)
      .where(eq(users.uniqueId, unique_id));

    if (result.length === 0) {
      return NextResponse.json(
        { message: 'Invalid Unique ID' },
        { status: 400 }
      );
    }

    const updated = await db.update(users)
      .set({
        teamName: team_name,
        member1: member1,
        member2: member2
      })
      .where(eq(users.uniqueId, unique_id))
      .returning();

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}
