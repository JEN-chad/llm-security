import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function createHeistHistory() {
    console.log("Creating heist_history table...");
    await sql`
        CREATE TABLE IF NOT EXISTS "heist_history" (
            "id" serial PRIMARY KEY NOT NULL,
            "unique_id" varchar(50) REFERENCES "users"("unique_id") ON DELETE CASCADE,
            "team_name" varchar(100),
            "money_taken" numeric(12, 2) NOT NULL,
            "bank_balance_after" numeric(12, 2) NOT NULL,
            "user_message" text,
            "created_at" timestamp DEFAULT now()
        )
    `;
    console.log("heist_history table created!");
}

createHeistHistory().catch(console.error);
