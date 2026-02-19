import { Router } from "express";
import { db } from "../db";
import { users, transactions } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Schema for creating/ensuring a user
const UserSchema = z.object({
    id: z.number(),
    username: z.string().optional(),
});

// Get user by ID
router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

        if (result.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(result[0]);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// Create or Get User (Upsert-ish logic from policy_service)
router.post("/ensure", async (req, res) => {
    try {
        const { id, username } = UserSchema.parse(req.body);

        let user = await db.select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        if (user.length > 0) {
            console.log("User exists:", user[0]);
            return res.json(user[0]);
        }

        // 🔥 REMOVE id FROM INSERT
        const newUsername = username || `user_${id}`;

        const newUser = await db.insert(users)
            .values({
                id,
                username: newUsername,
                wins: 0,
                failedAttempts: 0,
                failureStreak: 0
            })
            .returning();

        console.log("Inserted user:", newUser[0]);
        return res.json(newUser[0]);

    } catch (error: any) {
        console.error("ENSURE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});


// Update user stats (wins, failures)
router.patch("/:id/stats", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const schema = z.object({
            wins: z.number().optional(),
            failedAttempts: z.number().optional(),
            failureStreak: z.number().optional(),
        });
        const updateData = schema.parse(req.body);

        const updated = await db.update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning();

        res.json(updated[0]);
    } catch (error) {
        res.status(500).json({ error: "Update failed" });
    }
});

export default router;

