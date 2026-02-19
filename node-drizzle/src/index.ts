import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { db } from "./db";
import { users, globalStats, wallet } from "./db/schema";
import { eq } from "drizzle-orm";
// Routes will be imported here

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// Basic init route for seeding (idempotent)
app.post("/internal/init", async (req, res) => {
    try {
        console.log("🌱 Initializing database data...");

        // 1. Initialize Global Stats
        const stats = await db.select().from(globalStats).limit(1);
        if (stats.length === 0) {
            await db.insert(globalStats).values({ totalWins: 0, securityLevel: 1 });
            console.log("Created global stats");
        }

        // 2. Initialize Main Wallet
        const mainWallet = await db.select().from(wallet).where(eq(wallet.isMain, true)).limit(1);
        if (mainWallet.length === 0) {
            await db.insert(wallet).values({
                balance: "10000",
                isMain: true
            });
            console.log("Created main wallet");
        }

        // 3. Seed users (1-30) if not exist
        const userCount = await db.select().from(users).limit(1); // just check if any exist
        if (userCount.length === 0) { // simple check, ideally count
            console.log("Seeding users...");
            const userValues = [];
            for (let i = 1; i <= 30; i++) {
                userValues.push({ username: `user_${i}` });
            }
            await db.insert(users).values(userValues);

            // Create wallets for them
            const allUsers = await db.select().from(users);
            const walletValues = allUsers.map(u => ({
                userId: u.id,
                balance: "0.0",
                isMain: false
            }));
            await db.insert(wallet).values(walletValues);
        }

        res.json({ message: "Initialization complete" });
    } catch (e: any) {
        console.error("Init failed", e);
        res.status(500).json({ error: e.message });
    }
});

// Import routes
import userRoutes from "./routes/users";
import statsRoutes from "./routes/stats";
import transactionRoutes from "./routes/transactions";
import walletRoutes from "./routes/wallets";
import sessionRoutes from "./routes/sessions";

app.use("/internal/users", userRoutes);
app.use("/internal/global-stats", statsRoutes);
app.use("/internal/transactions", transactionRoutes);
app.use("/internal/wallets", walletRoutes);
app.use("/internal/sessions", sessionRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Node Drizzle Service running on port ${PORT}`);
});
