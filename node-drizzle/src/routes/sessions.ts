import { Router } from "express";
import { db } from "../db";
import { sessions } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.post("/", async (req, res) => {
    try {
        const schema = z.object({
            sessionId: z.string(),
            userId: z.number(),
        });
        const data = schema.parse(req.body);

        await db.insert(sessions).values({
            sessionId: data.sessionId,
            userId: data.userId,
            hasApproved: false
        });

        res.json({ status: "created" });
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

router.get("/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).limit(1);
        if (result.length === 0) return res.status(404).json({ error: "Session not found" });
        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

router.patch("/:sessionId/approve", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await db.update(sessions)
            .set({ hasApproved: true })
            .where(eq(sessions.sessionId, sessionId))
            .returning();

        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

export default router;
