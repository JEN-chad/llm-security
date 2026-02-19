import { Router } from "express";
import { db } from "../db";
import { globalStats } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/", async (req, res) => {
    try {
        let stats = await db.select().from(globalStats).limit(1);

        if (stats.length === 0) {
            // Auto-initialize if missing (safety net)
            stats = await db.insert(globalStats).values({ totalWins: 0, securityLevel: 1 }).returning();
        }

        res.json(stats[0]);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

router.patch("/", async (req, res) => {
    try {
        const schema = z.object({
            totalWins: z.number().optional(),
            securityLevel: z.number().optional(),
        });
        const data = schema.parse(req.body);

        // Assuming single row with ID 1 or similar, but we iterate since we don't know the ID
        // Actually, let's just update the first row found
        const existing = await db.select().from(globalStats).limit(1);
        if (existing.length === 0) {
            const created = await db.insert(globalStats).values({
                totalWins: data.totalWins ?? 0,
                securityLevel: data.securityLevel ?? 1
            }).returning();
            return res.json(created[0]);
        }

        const id = existing[0].id;
        const updated = await db.update(globalStats)
            .set(data)
            .where(eq(globalStats.id, id))
            .returning();

        res.json(updated[0]);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

export default router;
