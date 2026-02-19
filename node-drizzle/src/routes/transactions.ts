import { Router } from "express";
import { db } from "../db";
import { transactions } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.post("/", async (req, res) => {
    try {
        const schema = z.object({
            userId: z.number(),
            sessionId: z.string(),
            amount: z.number(),
            decision: z.string(),
            reason: z.string(),
        });

        const data = schema.parse(req.body);

        const newTxn = await db.insert(transactions).values({
            userId: data.userId,
            sessionId: data.sessionId,
            amount: data.amount.toString(),
            decision: data.decision,
            reason: data.reason
        }).returning();

        res.json(newTxn[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Transaction creation failed" });
    }
});

// Check recent attempts for cooldown
router.get("/recent-count", async (req, res) => {
    try {
        const userId = parseInt(req.query.userId as string);
        if (isNaN(userId)) return res.status(400).json({ error: "Invalid userId" });

        // Logic: count transactions in last minute
        // Postgres: created_at >= NOW() - INTERVAL '1 minute'

        const result = await db.execute(
            sql`SELECT count(*) as count FROM transactions 
                WHERE user_id = ${userId} 
                AND created_at >= NOW() - INTERVAL '1 minute'`
        );

        const count = result.rows[0].count;
        res.json({ count: parseInt(count as string) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error" });
    }
});

export default router;
