import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function dropMoneyAwarded() {
    console.log("Dropping money_awarded column from messages...");
    await sql`ALTER TABLE messages DROP COLUMN IF EXISTS money_awarded`;
    console.log("Done! money_awarded column removed.");
}

dropMoneyAwarded().catch(console.error);
