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

console.log("✅ Drizzle ORM connected to Neon PostgreSQL (via postgres.js)");
