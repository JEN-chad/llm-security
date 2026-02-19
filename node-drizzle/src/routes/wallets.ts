import { Router } from "express";
import { db } from "../db";
import { wallet } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Atomic transfer from main wallet to user wallet
router.post("/transfer", async (req, res) => {
    try {
        const schema = z.object({
            userId: z.number(),
            amount: z.number(),
        });
        const { userId, amount } = schema.parse(req.body);

        // Use a transaction to ensure atomicity
        const success = await db.transaction(async (tx) => {
            // 1. Deduct from main wallet
            // We use raw SQL for the specific update capability "SET balance = balance - amount WHERE balance >= amount"
            // Drizzle has sql operator but sometimes raw is cleaner for this specific atomic check

            const result = await tx.execute(
                sql`UPDATE wallet 
                    SET balance = balance - ${amount} 
                    WHERE is_main = true AND balance >= ${amount}`
            );

            if (result.rowCount === 0) {
                return false; // Insufficient funds or no main wallet
            }

            // 2. Credit user wallet
            // Check if user wallet exists
            const userWallet = await tx.select().from(wallet).where(eq(wallet.userId, userId)).limit(1);

            if (userWallet.length === 0) {
                await tx.insert(wallet).values({
                    userId: userId,
                    balance: amount.toString(),
                    isMain: false
                });
            } else {
                await tx.execute(
                    sql`UPDATE wallet 
                        SET balance = balance + ${amount} 
                        WHERE user_id = ${userId}`
                );
            }

            return true;
        });

        if (success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: "Transfer failed: Insufficient funds in main wallet" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Transfer failed" });
    }
});

router.get("/main", async (req, res) => {
    try {
        const result = await db.select().from(wallet).where(eq(wallet.isMain, true)).limit(1);
        if (result.length === 0) return res.json({ balance: 0.0 });
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

export default router;
