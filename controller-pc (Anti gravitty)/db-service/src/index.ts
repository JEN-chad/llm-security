import express from "express";
import { db, waitForDb } from "./db";
import { users, globalStats, wallet, sessions, transactions, adminControl, bankBalance, messages, heistHistory } from "./schema";
import { eq, and, gte, sql, count } from "drizzle-orm";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8002;

// ========================
// HELPER: Resolve any userId (numeric or string) to actual uniqueId
// ========================
async function resolveUserId(idParam: string): Promise<string | null> {
    // 1. Try direct uniqueId match
    const direct = await db.select().from(users).where(eq(users.uniqueId, idParam));
    if (direct.length > 0) return direct[0].uniqueId;

    // 2. Try "user_<id>" pattern (policy engine creates users this way)
    const prefixed = `user_${idParam}`;
    const byPrefix = await db.select().from(users).where(eq(users.uniqueId, prefixed));
    if (byPrefix.length > 0) return byPrefix[0].uniqueId;

    // 3. Try numeric index fallback
    const numId = parseInt(idParam);
    if (!isNaN(numId)) {
        const allUsers = await db.select().from(users);
        const found = allUsers.find((_u, i) => i + 1 === numId);
        if (found) return found.uniqueId;
    }

    return null;
}

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
                .values({ balance: "30000", isMain: true });
        }

        // 3. Initialize Bank Balance (mirrors main wallet balance)
        const existingBank = await db.select().from(bankBalance);
        if (existingBank.length === 0) {
            const mainWallet = await db
                .select()
                .from(wallet)
                .where(eq(wallet.isMain, true));
            const mainBal = mainWallet.length > 0 ? mainWallet[0].balance : "30000";
            console.log("🏦 Initializing Bank Balance...");
            await db.insert(bankBalance).values({ totalBalance: mainBal });
        }

        // 4. Seed users if empty
        const existingUsers = await db.select().from(users);
        if (existingUsers.length === 0) {
            console.log("👥 Seeding users...");
            const userValues = [];
            for (let i = 1; i <= 30; i++) {
                const uid = i <= 9 ? `SYSCONZ0${i}` : `SYSCONZ${i}`;
                userValues.push({ uniqueId: uid });
            }
            await db.insert(users).values(userValues);
        }

        // 5. Ensure each user has a wallet
        const allUsers = await db.select().from(users);
        for (const user of allUsers) {
            const existingWallet = await db
                .select()
                .from(wallet)
                .where(eq(wallet.userId, user.uniqueId));
            if (existingWallet.length === 0) {
                await db
                    .insert(wallet)
                    .values({ userId: user.uniqueId, balance: "0", isMain: false });
            }
        }

        // 6. Ensure each user has an admin_control entry (allow_signin = false)
        for (const user of allUsers) {
            const existingControl = await db
                .select()
                .from(adminControl)
                .where(eq(adminControl.uniqueId, user.uniqueId));
            if (existingControl.length === 0) {
                await db.insert(adminControl).values({
                    uniqueId: user.uniqueId,
                    allowSignin: false,
                });
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
        // Map to include a virtual numeric 'id' for backwards compatibility
        const mapped = result.map((u, i) => ({
            id: i + 1,
            username: u.uniqueId,
            uniqueId: u.uniqueId,
            failedAttempts: u.failedAttempts,
            wins: u.wins,
            lastAttemptTime: u.lastAttemptTime,
        }));
        res.json(mapped);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/users/:id", async (req, res) => {
    try {
        const idParam = req.params.id;
        // Support both numeric ID and string unique_id lookups
        // The policy engine sends numeric IDs, so we need to create an alias
        let result;
        // Try as direct unique_id first
        result = await db.select().from(users).where(eq(users.uniqueId, idParam));

        if (result.length === 0) {
            // Try looking up by numeric ID pattern — map numeric to SYSCONZ format
            const numId = parseInt(idParam);
            if (!isNaN(numId)) {
                // Lookup all users and find by index (policy engine uses numeric position)
                const allUsers = await db.select().from(users);
                // Try to find user by checking if any user was created with this numeric mapping
                const found = allUsers.find((_u, i) => i + 1 === numId);
                if (found) {
                    result = [found];
                }
            }
        }

        if (result.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return with backwards-compatible fields
        const u = result[0];
        res.json({
            id: parseInt(idParam) || 0,
            username: u.uniqueId,
            uniqueId: u.uniqueId,
            failedAttempts: u.failedAttempts,
            wins: u.wins,
            lastAttemptTime: u.lastAttemptTime,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/users", async (req, res) => {
    try {
        const { id, username, wins, failedAttempts } = req.body;
        // Create user with uniqueId — use username if provided, else generate from id
        const uid = username || `user_${id}`;
        const values: any = { uniqueId: uid };
        if (wins !== undefined) values.wins = wins;
        if (failedAttempts !== undefined) values.failedAttempts = failedAttempts;

        const result = await db.insert(users).values(values).returning();
        const u = result[0];

        // Also create admin_control entry for the new user
        try {
            await db.insert(adminControl).values({
                uniqueId: u.uniqueId,
                allowSignin: false,
            });
        } catch (_e) {
            // Ignore if already exists (duplicate key)
        }

        res.json({
            id: id || 0,
            username: u.uniqueId,
            uniqueId: u.uniqueId,
            failedAttempts: u.failedAttempts,
            wins: u.wins,
            lastAttemptTime: u.lastAttemptTime,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.patch("/users/:id", async (req, res) => {
    try {
        const idParam = req.params.id;
        const updates: any = {};

        if (req.body.failedAttempts !== undefined)
            updates.failedAttempts = req.body.failedAttempts;
        if (req.body.wins !== undefined) updates.wins = req.body.wins;
        if (req.body.lastAttemptTime !== undefined)
            updates.lastAttemptTime = new Date(req.body.lastAttemptTime);

        // Try direct unique_id match first
        let result = await db
            .update(users)
            .set(updates)
            .where(eq(users.uniqueId, idParam))
            .returning();

        if (result.length === 0) {
            // Try numeric index lookup
            const numId = parseInt(idParam);
            if (!isNaN(numId)) {
                const allUsers = await db.select().from(users);
                const found = allUsers.find((_u, i) => i + 1 === numId);
                if (found) {
                    result = await db
                        .update(users)
                        .set(updates)
                        .where(eq(users.uniqueId, found.uniqueId))
                        .returning();
                }
            }
        }

        if (result.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const u = result[0];
        res.json({
            id: parseInt(idParam) || 0,
            username: u.uniqueId,
            uniqueId: u.uniqueId,
            failedAttempts: u.failedAttempts,
            wins: u.wins,
            lastAttemptTime: u.lastAttemptTime,
        });
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
        const userIdParam = req.params.userId;
        // Resolve numeric or string userId to actual uniqueId
        const resolvedUid = await resolveUserId(userIdParam);
        const lookupId = resolvedUid || userIdParam;
        const result = await db
            .select()
            .from(wallet)
            .where(eq(wallet.userId, lookupId));
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
            .values({ balance: "30000", isMain: true })
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

        // Resolve the incoming userId to an actual uniqueId in users table
        // Policy engine sends numeric IDs, but users table has varchar PKs
        const resolvedUid = await resolveUserId(String(userId));
        if (!resolvedUid) {
            return res.json({ success: false, reason: "User not found for wallet transfer" });
        }

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

        // 2. Also update bank_balance to stay in sync with main wallet
        try {
            await db
                .update(bankBalance)
                .set({
                    totalBalance: sql`${bankBalance.totalBalance}::numeric - ${amountStr}::numeric`,
                });
        } catch (e) {
            console.error("Bank balance sync error:", e);
        }

        // 3. Credit user wallet (using resolved uniqueId)
        const userWalletResult = await db
            .select()
            .from(wallet)
            .where(eq(wallet.userId, resolvedUid));

        if (userWalletResult.length === 0) {
            await db
                .insert(wallet)
                .values({ userId: resolvedUid, balance: amountStr, isMain: false });
        } else {
            await db
                .update(wallet)
                .set({
                    balance: sql`${wallet.balance}::numeric + ${amountStr}::numeric`,
                })
                .where(eq(wallet.userId, resolvedUid));
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
        const userIdStr = String(req.query.userId);
        const resolvedUid = await resolveUserId(userIdStr);
        const lookupId = resolvedUid || userIdStr;
        const seconds = parseInt((req.query.seconds as string) || "60");

        const cutoff = new Date(Date.now() - seconds * 1000);

        const result = await db
            .select({ count: count() })
            .from(transactions)
            .where(
                and(
                    eq(transactions.userId, lookupId),
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
        const resolvedUid = await resolveUserId(String(userId));
        const finalUid = resolvedUid || String(userId);
        const result = await db
            .insert(transactions)
            .values({
                userId: finalUid,
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
        const resolvedUid = await resolveUserId(String(userId));
        const finalUid = resolvedUid || String(userId);
        const result = await db
            .insert(sessions)
            .values({
                sessionId,
                userId: finalUid,
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
async function start() {
    await waitForDb();
    app.listen(PORT, () => {
        console.log(`🚀 DB Service running on port ${PORT}`);
    });
}

start();
