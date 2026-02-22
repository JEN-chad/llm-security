import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, messages } from '@/lib/schema';
import { eq } from 'drizzle-orm';

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

    // 2. Generate a session ID for this chat interaction
    const sessionId = `SESSION_${unique_id}_${Date.now()}`;

    // 3. Call the Policy Engine via API Gateway
    let policyReply = 'System is processing your request...';
    let policyStatus = 'REJECTED';
    let moneyAwarded = 0;

    try {
      const policyRes = await fetch(`${POLICY_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          user_id: unique_id,
          session_id: sessionId,
        }),
      });

      if (policyRes.ok) {
        const policyData = await policyRes.json();
        policyReply = policyData.message || policyData.reason || 'No response from vault.';
        policyStatus = policyData.status || 'REJECTED';

        // If approved, the policy engine already transferred wallet funds
        // AND inserted heist_history AND updated bank_balance atomically
        // via the db-service /wallet/heist-transfer endpoint.
        // DO NOT update wallet, bank_balance, or heist_history here — that
        // would cause duplicate entries and balance corruption.
        if (policyStatus === 'APPROVED') {
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

    // 4. Save message to messages table (per-user chat history)
    try {
      await db.insert(messages).values({
        uniqueId: unique_id,
        userMessage: message,
        llmMessage: policyReply,
        moneyAwarded: String(moneyAwarded),
      });
    } catch (e) {
      console.error('[chat] messages insert failed:', e);
    }

    // NOTE: wallet, bank_balance, and heist_history are ALL managed atomically
    // by the db-service's /wallet/heist-transfer endpoint. This route only
    // saves the chat message. No balance writes happen here.

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
 * Calculate reward amount based on the policy engine's final score.
 * Used only for the response — actual wallet transfer is done by db-service.
 */
function calculateRewardFromScore(score: number): number {
  if (score >= 0.85) return 300;
  if (score >= 0.75) return 200;
  if (score >= 0.65) return 100;
  return 50;
}
