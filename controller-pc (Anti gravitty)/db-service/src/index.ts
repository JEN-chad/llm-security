import express from "express";
import { db, waitForDb } from "./db";
import { users, globalStats, wallet, sessions, transactions, adminControl, bankBalance, messages, heistHistory } from "./schema";
import { eq, and, gte, sql, count } from "drizzle-orm";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8002;

// ========================
// HELPER: Resolve userId string to actual uniqueId
// ========================
async function resolveUserId(idParam: string): Promise<string | null> {
    // Direct uniqueId match (IDs are now always SYSCONZ-format strings)
    const direct = await db.select().from(users).where(eq(users.uniqueId, idParam));
    if (direct.length > 0) return direct[0].uniqueId;

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
        // Use username (string uniqueId) directly; id is ignored if username is provided
        const uid = username || String(id);
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
        const amountNum = parseFloat(String(amount));
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.json({ success: false, reason: "Invalid amount" });
        }

        // Resolve the incoming userId to an actual uniqueId in users table
        const resolvedUid = await resolveUserId(String(userId));
        if (!resolvedUid) {
            return res.json({ success: false, reason: "User not found for wallet transfer" });
        }

        // ── Step 1: Read current main wallet ─────────────────────────────
        const mainWalletRows = await db
            .select()
            .from(wallet)
            .where(eq(wallet.isMain, true));

        if (mainWalletRows.length === 0) {
            return res.json({ success: false, reason: "Main wallet not found" });
        }
        const mainWalletId = mainWalletRows[0].id;
        const mainBalance = parseFloat(mainWalletRows[0].balance);

        if (mainBalance < amountNum) {
            return res.json({ success: false, reason: "Insufficient balance" });
        }

        // ── Step 2: Atomically deduct from main wallet (by primary key) ───
        // Use numeric arithmetic in SQL; guard with numeric comparison too.
        // We use the row's primary key so the UPDATE is unambiguous (one row only).
        const deductResult = await db
            .update(wallet)
            .set({
                balance: sql`balance - ${amountNum}`,
            })
            .where(
                and(
                    eq(wallet.id, mainWalletId),
                    sql`balance >= ${amountNum}`
                )
            )
            .returning();

        // Guard: if 0 rows updated then vault balance was actually insufficient
        if (deductResult.length === 0) {
            return res.json({ success: false, reason: "Deduction failed — vault balance too low" });
        }

        // The new vault balance after deduction
        const newVaultBalance = deductResult[0].balance; // e.g. "29800.00"

        // ── Step 3: Keep bank_balance in sync with main wallet ────────────
        // This MUST stay in sync with the wallet (isMain=true) row.
        // Do NOT wrap in a silent try/catch — let errors surface so the
        // caller knows the transfer failed rather than silently diverging.
        const bankRows = await db.select().from(bankBalance);
        if (bankRows.length > 0) {
            await db
                .update(bankBalance)
                .set({ totalBalance: newVaultBalance })
                .where(eq(bankBalance.id, bankRows[0].id));
        } else {
            // No bank_balance row yet — create one mirroring the vault
            await db.insert(bankBalance).values({ totalBalance: newVaultBalance });
        }
        console.log(`[transfer] bank_balance synced to ${newVaultBalance}`);

        // ── Step 4: Credit the user's wallet ─────────────────────────────
        const userWalletRows = await db
            .select()
            .from(wallet)
            .where(eq(wallet.userId, resolvedUid));

        if (userWalletRows.length === 0) {
            await db
                .insert(wallet)
                .values({ userId: resolvedUid, balance: String(amountNum), isMain: false });
        } else {
            await db
                .update(wallet)
                .set({
                    balance: sql`balance + ${amountNum}`,
                })
                .where(eq(wallet.id, userWalletRows[0].id));
        }

        console.log(`[transfer] vault: ${mainBalance} → ${newVaultBalance} | user ${resolvedUid} +${amountNum}`);
        res.json({ success: true, newVaultBalance });
    } catch (error: any) {
        console.error("Transfer error:", error);
        res.json({ success: false, reason: error.message });
    }
});

// ========================
// HEIST TRANSFER — FULLY ATOMIC
// All steps run inside ONE PostgreSQL transaction with FOR UPDATE locking.
// Steps:
//   BEGIN
//   A. SELECT ... FOR UPDATE (lock main wallet row)
//   B. Verify sufficient funds
//   C. UPDATE wallet (deduct from main)
//   D. UPDATE wallet (credit user)
//   E. SELECT balance FROM wallet WHERE is_main = true  (re-fetch — no manual calc)
//   F. INSERT heist_history (bank_balance_after = freshly fetched balance)
//   G. UPDATE bank_balance (sync to main wallet)
//   COMMIT  (or ROLLBACK on any error)
// ========================
app.post("/wallet/heist-transfer", async (req, res) => {
    try {
        const { userId, amount, sessionId, userMessage } = req.body;
        const amountNum = parseFloat(String(amount));
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.json({ success: false, reason: "Invalid amount" });
        }

        // Resolve the incoming userId to an actual uniqueId in users table
        const resolvedUid = await resolveUserId(String(userId));
        if (!resolvedUid) {
            return res.json({ success: false, reason: "User not found for heist transfer" });
        }

        // Fetch team name for heist_history record (outside tx is fine — read-only metadata)
        const userRows = await db.select().from(users).where(eq(users.uniqueId, resolvedUid));
        const teamName = userRows[0]?.teamName ?? null;

        // ── SINGLE ATOMIC TRANSACTION ─────────────────────────────────────────
        const result = await db.transaction(async (tx) => {

            // A. Lock the main wallet row with FOR UPDATE (prevents concurrent reads)
            const lockedRows = await tx.execute(
                sql`SELECT id, balance FROM wallet WHERE is_main = true FOR UPDATE`
            );

            if (!lockedRows.rows || lockedRows.rows.length === 0) {
                throw new Error("Main wallet not found");
            }

            const mainWalletId = lockedRows.rows[0].id as number;
            const mainBalance = parseFloat(String(lockedRows.rows[0].balance));

            // B. Verify sufficient funds
            if (mainBalance < amountNum) {
                throw new Error(`Insufficient vault funds: have ${mainBalance}, need ${amountNum}`);
            }

            // C. Deduct from main wallet
            await tx
                .update(wallet)
                .set({ balance: sql`balance - ${amountNum}` })
                .where(eq(wallet.id, mainWalletId));

            // D. Credit the user's wallet
            const userWalletRows = await tx
                .select()
                .from(wallet)
                .where(eq(wallet.userId, resolvedUid));

            if (userWalletRows.length === 0) {
                await tx.insert(wallet).values({
                    userId: resolvedUid,
                    balance: String(amountNum),
                    isMain: false,
                });
            } else {
                await tx
                    .update(wallet)
                    .set({ balance: sql`balance + ${amountNum}` })
                    .where(eq(wallet.id, userWalletRows[0].id));
            }

            // E. Re-fetch updated main wallet balance (DO NOT compute manually)
            const updatedMainRows = await tx
                .select({ balance: wallet.balance })
                .from(wallet)
                .where(eq(wallet.isMain, true));

            const updatedMainBalance = updatedMainRows[0].balance; // e.g. "29800.00"

            // F. Insert heist_history with the freshly fetched balance
            // sessionId is the idempotency key — the DB UNIQUE constraint on session_id
            // will reject this INSERT if the same session has already committed a heist.
            const heistRows = await tx
                .insert(heistHistory)
                .values({
                    uniqueId: resolvedUid,
                    sessionId: sessionId ?? null,
                    teamName: teamName,
                    moneyTaken: String(amountNum),
                    bankBalanceAfter: updatedMainBalance,
                    userMessage: userMessage ?? null,
                    createdAt: new Date(),
                })
                .returning();

            // G. Update bank_balance table to mirror the main wallet exactly
            const bankRows = await tx.select().from(bankBalance);
            if (bankRows.length > 0) {
                await tx
                    .update(bankBalance)
                    .set({ totalBalance: updatedMainBalance })
                    .where(eq(bankBalance.id, bankRows[0].id));
            } else {
                await tx.insert(bankBalance).values({ totalBalance: updatedMainBalance });
            }

            console.log(
                `[heist-transfer] COMMITTED: user=${resolvedUid} amount=${amountNum} newVault=${updatedMainBalance}`
            );

            return {
                newVaultBalance: updatedMainBalance,
                heistRecord: heistRows[0],
            };
        });
        // ── END TRANSACTION ───────────────────────────────────────────────────

        res.json({ success: true, ...result });
    } catch (error: any) {
        console.error("[heist-transfer] ROLLBACK:", error.message);
        res.json({ success: false, reason: error.message });
    }
});

// ========================
// BANK BALANCE
// Always mirrors wallet WHERE isMain = true.
// ========================

// Helper: sync bank_balance to the current isMain wallet balance
async function syncBankBalance(): Promise<string | null> {
    const mainRows = await db.select().from(wallet).where(eq(wallet.isMain, true));
    if (mainRows.length === 0) return null;
    const vaultBalance = mainRows[0].balance;
    const bankRows = await db.select().from(bankBalance);
    if (bankRows.length > 0) {
        await db
            .update(bankBalance)
            .set({ totalBalance: vaultBalance })
            .where(eq(bankBalance.id, bankRows[0].id));
    } else {
        await db.insert(bankBalance).values({ totalBalance: vaultBalance });
    }
    return vaultBalance;
}

app.get("/bank-balance", async (_req, res) => {
    try {
        // Always read & sync from the isMain wallet (source of truth)
        const vaultBalance = await syncBankBalance();
        if (vaultBalance === null) {
            return res.status(404).json({ error: "Main wallet not found" });
        }
        res.json({ totalBalance: vaultBalance, source: "wallet_isMain" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Force-sync bank_balance from the isMain wallet (useful after manual DB edits)
app.post("/bank-balance/sync", async (_req, res) => {
    try {
        const vaultBalance = await syncBankBalance();
        if (vaultBalance === null) {
            return res.status(404).json({ error: "Main wallet not found" });
        }
        console.log(`[bank-balance/sync] Forced sync → ${vaultBalance}`);
        res.json({ success: true, totalBalance: vaultBalance, source: "wallet_isMain" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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
// STARTUP: Auto-sync bankBalance ↔ wallet isMain=true
// Runs once on every boot — no manual call required.
// Uses the shared syncBankBalance() helper.
// ========================
async function syncBankBalanceOnBoot() {
    try {
        const vaultBalance = await syncBankBalance();
        if (vaultBalance === null) {
            console.warn("⚠️  No isMain wallet found during boot sync — skipping bankBalance sync");
            return;
        }
        console.log(`🏦 Boot sync: bank_balance set to ${vaultBalance} (matches isMain wallet)`);
    } catch (e) {
        console.error("❌ Boot sync (bank_balance) failed:", e);
    }
}

// ========================
// START SERVER
// ========================
async function start() {
    await waitForDb();
    await syncBankBalanceOnBoot();
    app.listen(PORT, () => {
        console.log(`🚀 DB Service running on port ${PORT}`);
    });
}

start();
