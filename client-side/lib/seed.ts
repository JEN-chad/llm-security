import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users, adminControl } from "./schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
    console.log("Seeding database...\n");

    const userRows = [];
    const adminControlRows = [];

    for (let i = 1; i <= 30; i++) {
        const uniqueId = `SYSCONZ${String(i).padStart(2, "0")}`;
        userRows.push({
            uniqueId,
            teamName: null,
            member1: null,
            member2: null,
            walletBalance: "0",
            isOnline: false,
            failedAttempts: 0,
            wins: 0,
        });
        adminControlRows.push({
            uniqueId,
            allowSignin: false,
        });
    }

    console.log("Inserting 30 users (SYSCONZ01 - SYSCONZ30)...");
    await db.insert(users).values(userRows).onConflictDoNothing();

    console.log("Inserting 30 admin_control entries...");
    await db.insert(adminControl).values(adminControlRows).onConflictDoNothing();

    console.log("\nSeeding complete! 30 users (SYSCONZ01 - SYSCONZ30) added.");
}

seed().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
