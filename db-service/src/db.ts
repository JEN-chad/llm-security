import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error("❌ DATABASE_URL environment variable is required");
}

const client = postgres(DATABASE_URL, { ssl: "require" });
export const db = drizzle(client, { schema });

/**
 * Retry connecting to Neon DB with exponential backoff.
 * Neon free tier suspends after 5 min of inactivity; wake-up takes a few seconds.
 */
export async function waitForDb(maxRetries = 10, initialDelayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await client`SELECT 1`;
            console.log("✅ Neon DB is ready!");
            return;
        } catch (err: any) {
            const delay = Math.min(initialDelayMs * Math.pow(1.5, attempt - 1), 15000);
            console.warn(
                `⏳ Waiting for Neon DB to wake up... (attempt ${attempt}/${maxRetries}) — retrying in ${Math.round(delay / 1000)}s`
            );
            if (attempt === maxRetries) {
                console.error("❌ Could not connect to Neon DB after all retries:", err.message);
                throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}
