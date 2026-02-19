import express from "express";
import { db } from "./db";
import { users, globalStats, wallet, sessions, transactions } from "./schema";
import { eq, and, gte, sql, count } from "drizzle-orm";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8002;

// ========================
// HEALTH CHECK
// ========================
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

// ========================
// INIT / SEED
// ========================
app.post("/init", async (_req, res) => {
    try {
        // Push schema (tables are created via drizzle-kit push in Dockerfile)
        // Here we just seed data if empty

        // 1. Initialize Global Stats
        const existingStats = await db.select().from(globalStats);
        if (existingStats.length === 0) {
            console.log("🌍 Initializing Global Stats...");
            await db.insert(globalStats).values({ totalWins: 0, securityLevel: 1 });
        }

        // 2. Initialize Main Wallet
        const existingMainWallet = await db
            .select()
            .from(wallet)
            .where(eq(wallet.isMain, true));
        if (existingMainWallet.length === 0) {
            console.log("💰 Creating main wallet...");
            await db
                .insert(wallet)
                .values({ balance: "10000", isMain: true });
        }

        // 3. Seed users if empty
        const existingUsers = await db.select().from(users);
        if (existingUsers.length === 0) {
            console.log("👥 Seeding users...");
            const userValues = [];
            for (let i = 1; i <= 30; i++) {
                userValues.push({ username: `user_${i}` });
            }
            await db.insert(users).values(userValues);
        }

        // 4. Ensure each user has a wallet
        const allUsers = await db.select().from(users);
        for (const user of allUsers) {
            const existingWallet = await db
                .select()
                .from(wallet)
                .where(eq(wallet.userId, user.id));
            if (existingWallet.length === 0) {
                await db
                    .insert(wallet)
                    .values({ userId: user.id, balance: "0", isMain: false });
            }
        }

        console.log("✅ Database initialized and seeded");
        res.json({ status: "ok", message: "Database initialized" });
    } catch (error: any) {
        console.error("❌ Init error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ========================
// USERS
// ========================
app.get("/users", async (_req, res) => {
    try {
        const result = await db.select().from(users);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/users/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db.select().from(users).where(eq(users.id, id));
        if (result.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/users", async (req, res) => {
    try {
        const { id, username, wins, failedAttempts } = req.body;
        const values: any = { username: username || `user_${id}` };
        if (wins !== undefined) values.wins = wins;
        if (failedAttempts !== undefined) values.failedAttempts = failedAttempts;

        const result = await db.insert(users).values(values).returning();
        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.patch("/users/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updates: any = {};

        if (req.body.failedAttempts !== undefined)
            updates.failedAttempts = req.body.failedAttempts;
        if (req.body.wins !== undefined) updates.wins = req.body.wins;
        if (req.body.lastAttemptTime !== undefined)
            updates.lastAttemptTime = new Date(req.body.lastAttemptTime);

        const result = await db
            .update(users)
            .set(updates)
            .where(eq(users.id, id))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ========================
// GLOBAL STATS
// ========================
app.get("/global-stats", async (_req, res) => {
    try {
        const result = await db.select().from(globalStats);
        if (result.length === 0) {
            return res.status(404).json({ error: "Global stats not found" });
        }
        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.patch("/global-stats", async (req, res) => {
    try {
        const updates: any = {};
        if (req.body.totalWins !== undefined) updates.totalWins = req.body.totalWins;
        if (req.body.securityLevel !== undefined)
            updates.securityLevel = req.body.securityLevel;

        const result = await db.select().from(globalStats);
        if (result.length === 0) {
            return res.status(404).json({ error: "Global stats not found" });
        }

        const updated = await db
            .update(globalStats)
            .set(updates)
            .where(eq(globalStats.id, result[0].id))
            .returning();

        res.json(updated[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ========================
// WALLET
// ========================
app.get("/wallet/main", async (_req, res) => {
    try {
        const result = await db
            .select()
            .from(wallet)
            .where(eq(wallet.isMain, true));
        if (result.length === 0) {
            return res.status(404).json({ error: "Main wallet not found" });
        }
        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/wallet/user/:userId", async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const result = await db
            .select()
            .from(wallet)
            .where(eq(wallet.userId, userId));
        if (result.length === 0) {
            return res.status(404).json({ error: "User wallet not found" });
        }
        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/wallet/init-main", async (_req, res) => {
    try {
        const existing = await db
            .select()
            .from(wallet)
            .where(eq(wallet.isMain, true));
        if (existing.length > 0) {
            return res.json({ status: "exists", wallet: existing[0] });
        }
        const result = await db
            .insert(wallet)
            .values({ balance: "10000", isMain: true })
            .returning();
        res.json({ status: "created", wallet: result[0] });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/wallet/transfer", async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const amountStr = String(amount);

        // 1. Deduct from main wallet (only if sufficient balance)
        const mainWalletResult = await db
            .select()
            .from(wallet)
            .where(eq(wallet.isMain, true));

        if (mainWalletResult.length === 0) {
            return res.json({ success: false, reason: "Main wallet not found" });
        }

        const mainBalance = parseFloat(mainWalletResult[0].balance);
        if (mainBalance < parseFloat(amountStr)) {
            return res.json({ success: false, reason: "Insufficient balance" });
        }

        // Deduct from main
        await db
            .update(wallet)
            .set({
                balance: sql`${wallet.balance}::numeric - ${amountStr}::numeric`,
            })
            .where(and(eq(wallet.isMain, true), gte(wallet.balance, amountStr)));

        // 2. Credit user wallet
        const userWalletResult = await db
            .select()
            .from(wallet)
            .where(eq(wallet.userId, userId));

        if (userWalletResult.length === 0) {
            await db
                .insert(wallet)
                .values({ userId, balance: amountStr, isMain: false });
        } else {
            await db
                .update(wallet)
                .set({
                    balance: sql`${wallet.balance}::numeric + ${amountStr}::numeric`,
                })
                .where(eq(wallet.userId, userId));
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error("Transfer error:", error);
        res.json({ success: false, reason: error.message });
    }
});

// ========================
// TRANSACTIONS
// ========================
app.get("/transactions/count-recent", async (req, res) => {
    try {
        const userId = parseInt(req.query.userId as string);
        const seconds = parseInt((req.query.seconds as string) || "60");

        const cutoff = new Date(Date.now() - seconds * 1000);

        const result = await db
            .select({ count: count() })
            .from(transactions)
            .where(
                and(
                    eq(transactions.userId, userId),
                    gte(transactions.createdAt, cutoff)
                )
            );

        res.json({ count: result[0]?.count || 0 });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/transactions", async (req, res) => {
    try {
        const { userId, sessionId, amount, decision, reason } = req.body;
        const result = await db
            .insert(transactions)
            .values({
                userId,
                sessionId,
                amount: String(amount),
                decision,
                reason,
                createdAt: new Date(),
            })
            .returning();
        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ========================
// SESSIONS
// ========================
app.get("/sessions/:id", async (req, res) => {
    try {
        const sessionId = req.params.id;
        const result = await db
            .select()
            .from(sessions)
            .where(eq(sessions.sessionId, sessionId));
        if (result.length === 0) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/sessions", async (req, res) => {
    try {
        const { sessionId, userId, hasApproved } = req.body;
        const result = await db
            .insert(sessions)
            .values({
                sessionId,
                userId,
                hasApproved: hasApproved || false,
                createdAt: new Date(),
            })
            .returning();
        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.patch("/sessions/:id", async (req, res) => {
    try {
        const sessionId = req.params.id;
        const updates: any = {};
        if (req.body.hasApproved !== undefined)
            updates.hasApproved = req.body.hasApproved;

        const result = await db
            .update(sessions)
            .set(updates)
            .where(eq(sessions.sessionId, sessionId))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.json(result[0]);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ========================
// START SERVER
// ========================
app.listen(PORT, () => {
    console.log(`🚀 DB Service running on port ${PORT}`);
});
