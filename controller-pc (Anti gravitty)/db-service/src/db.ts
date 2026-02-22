import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error("❌ DATABASE_URL environment variable is required");
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // required for Neon
    },
});

export const db = drizzle(pool, { schema });

/**
 * Retry connecting to Neon DB with exponential backoff.
 */
export async function waitForDb(maxRetries = 10, initialDelayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await pool.query("SELECT 1");
            console.log("✅ Neon DB is ready!");
            return;
        } catch (err: any) {
            const delay = Math.min(initialDelayMs * Math.pow(1.5, attempt - 1), 15000);
            console.warn(
                `⏳ Waiting for Neon DB... (attempt ${attempt}/${maxRetries}) — retrying in ${Math.round(delay / 1000)}s`
            );

            if (attempt === maxRetries) {
                console.error("❌ Could not connect to Neon DB after all retries:", err.message);
                throw err;
            }

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}