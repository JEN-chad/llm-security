import { NextResponse } from 'next/server';
import { db, sql as rawSql } from '@/lib/db';
import { users, messages, bankBalance, heistHistory, transactions } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';

// Policy engine API gateway URL (controller-pc runs locally via Docker)
const POLICY_API_URL = process.env.POLICY_API_URL || 'http://localhost:8000';

export async function POST(req: Request) {
  try {
    const { unique_id, message } = await req.json();

    if (!unique_id || !message) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Verify user exists (FK guard — prevents FK violation on messages insert)
    const userRows = await db
      .select({ teamName: users.teamName })
      .from(users)
      .where(eq(users.uniqueId, unique_id));

    if (userRows.length === 0) {
      return NextResponse.json(
        { message: 'User not found — cannot store message' },
        { status: 404 }
      );
    }
    const teamName = userRows[0]?.teamName ?? null;

    // 2. Generate a session ID for this chat interaction
    const sessionId = `SESSION_${unique_id}_${Date.now()}`;

    // 3. Call the Policy Engine via API Gateway
    let policyReply = 'System is processing your request...';
    let policyStatus = 'REJECTED';
    let moneyAwarded = 0;

    try {
      // Use a numeric hash of unique_id for the policy engine's user_id field
      const numericUserId = hashStringToInt(unique_id);

      const policyRes = await fetch(`${POLICY_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          user_id: numericUserId,
          session_id: sessionId,
        }),
      });

      if (policyRes.ok) {
        const policyData = await policyRes.json();
        // Use only the 'message' field from policy response for the chat reply
        policyReply = policyData.message || policyData.reason || 'No response from vault.';
        policyStatus = policyData.status || 'REJECTED';

        // If approved, the policy engine already transferred wallet funds via db-service.
        // We still need to update the admin-side DB (bank_balance, user wallet, heist_history)
        // since the policy engine's db-service operates on its own schema.
        if (policyStatus === 'APPROVED') {
          // Calculate reward from policy: score-based
          const score = policyData.score || 0;
          moneyAwarded = calculateRewardFromScore(score);
        }
      } else {
        const errData = await policyRes.json().catch(() => ({}));
        console.error('[chat] Policy engine error:', policyRes.status, errData);
        policyReply = errData.detail || 'Vault system temporarily unavailable.';
      }
    } catch (policyErr) {
      console.error('[chat] Failed to reach policy engine:', policyErr);
      policyReply = 'Connection to vault system failed. Services may be offline.';
    }

    // 4. Update user wallet (add money if approved)
    if (moneyAwarded > 0) {
      try {
        await db.update(users)
          .set({ walletBalance: sql`COALESCE(${users.walletBalance}, 0) + ${moneyAwarded}` })
          .where(eq(users.uniqueId, unique_id));
      } catch (e) {
        console.error('[chat] wallet update failed:', e);
      }

      // 5. Deduct from bank balance
      try {
        await db.update(bankBalance)
          .set({ totalBalance: sql`${bankBalance.totalBalance} - ${moneyAwarded}` });
      } catch (e) {
        console.error('[chat] bank deduct failed:', e);
      }
    }

    // 6. Get updated bank balance for heist record
    let bankAfter = '0';
    try {
      const bankResult = await db
        .select({ totalBalance: bankBalance.totalBalance })
        .from(bankBalance).limit(1);
      bankAfter = bankResult[0]?.totalBalance ?? '0';
    } catch (e) {
      console.error('[chat] bank balance fetch failed:', e);
    }

    // 7. Save message to messages table (per-user chat history)
    //    llmMessage now stores the actual policy engine response
    try {
      await db.insert(messages).values({
        uniqueId: unique_id,
        userMessage: message,
        llmMessage: policyReply,
        moneyAwarded: String(moneyAwarded),
      });
    } catch (e) {
      console.error('[chat] messages insert failed, trying raw SQL fallback:', e);
      try {
        await rawSql`INSERT INTO messages (unique_id, user_message, llm_message, money_awarded) VALUES (${unique_id}, ${message}, ${policyReply}, ${String(moneyAwarded)})`;
      } catch (e2) {
        console.error('[chat] raw SQL messages insert also failed:', e2);
      }
    }

    // 8. Record transaction (audit log)
    try {
      await db.insert(transactions).values({
        userId: unique_id,
        amount: String(moneyAwarded),
        decision: policyStatus === 'APPROVED' ? 'heist' : 'rejected',
        reason: message,
      });
    } catch (e) {
      console.error('[chat] transaction insert failed:', e);
    }

    // 9. Record heist history (only if money was awarded)
    if (moneyAwarded > 0) {
      try {
        await db.insert(heistHistory).values({
          uniqueId: unique_id,
          teamName: teamName,
          moneyTaken: String(moneyAwarded),
          bankBalanceAfter: String(bankAfter),
          userMessage: message,
        });
      } catch (e) {
        console.error('[chat] heistHistory insert failed:', e);
      }
    }

    return NextResponse.json({
      reply: policyReply,
      money_awarded: moneyAwarded,
      status: policyStatus,
    });

  } catch (error) {
    console.error('[chat] Unhandled Chat API Error:', error);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}


/**
 * Convert a string unique_id to a stable integer for the policy engine.
 * Uses a simple hash to produce a consistent numeric ID.
 */
function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) || 1; // Ensure positive non-zero
}

/**
 * Calculate reward amount based on the policy engine's final score.
 * Mirrors the policy engine's reward logic so the admin-side DB stays in sync.
 */
function calculateRewardFromScore(score: number): number {
  if (score >= 0.85) return 300;
  if (score >= 0.75) return 200;
  if (score >= 0.65) return 100;
  return 50;
}
