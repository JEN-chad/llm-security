import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function seedGlobalStats() {
    const existing = await sql`SELECT * FROM global_stats LIMIT 1`;
    if (existing.length === 0) {
        await sql`INSERT INTO global_stats (total_wins, security_level) VALUES (0, 1)`;
        console.log("Inserted default globalStats row (security_level: 1)");
    } else {
        console.log("globalStats already exists:", existing[0]);
    }
}

seedGlobalStats().catch(console.error);
