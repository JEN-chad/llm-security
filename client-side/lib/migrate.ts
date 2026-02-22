import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
    console.log("Starting migration: participants -> users merge...\n");

    // 1. Drop dependent tables first (foreign key constraints)
    console.log("Dropping dependent tables (messages, admin_control)...");
    await sql`DROP TABLE IF EXISTS messages CASCADE`;
    await sql`DROP TABLE IF EXISTS admin_control CASCADE`;

    // 2. Drop old tables
    console.log("Dropping old tables (participants, wallet, sessions, transactions, global_stats, bank_balance, users)...");
    await sql`DROP TABLE IF EXISTS participants CASCADE`;
    await sql`DROP TABLE IF EXISTS wallet CASCADE`;
    await sql`DROP TABLE IF EXISTS sessions CASCADE`;
    await sql`DROP TABLE IF EXISTS transactions CASCADE`;
    await sql`DROP TABLE IF EXISTS global_stats CASCADE`;
    await sql`DROP TABLE IF EXISTS bank_balance CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;

    // 3. Drop drizzle migration tracking so push/generate starts fresh
    console.log("Dropping drizzle migration tracking...");
    await sql`DROP TABLE IF EXISTS __drizzle_migrations CASCADE`;

    // 4. Create new users table (merged from participants + old users)
    console.log("Creating users table...");
    await sql`
        CREATE TABLE "users" (
            "unique_id" varchar(50) PRIMARY KEY NOT NULL,
            "team_name" varchar(100),
            "member1" varchar(100),
            "member2" varchar(100),
            "wallet_balance" numeric(12, 2) DEFAULT '0',
            "is_online" boolean DEFAULT false,
            "created_at" timestamp DEFAULT now(),
            "failed_attempts" integer DEFAULT 0 NOT NULL,
            "wins" integer DEFAULT 0 NOT NULL,
            "last_attempt_time" timestamp DEFAULT now()
        )
    `;

    // 5. Create global_stats table
    console.log("Creating global_stats table...");
    await sql`
        CREATE TABLE "global_stats" (
            "id" serial PRIMARY KEY NOT NULL,
            "total_wins" integer DEFAULT 0 NOT NULL,
            "security_level" integer DEFAULT 1 NOT NULL
        )
    `;

    // 6. Create wallet table
    console.log("Creating wallet table...");
    await sql`
        CREATE TABLE "wallet" (
            "id" serial PRIMARY KEY NOT NULL,
            "user_id" varchar(50),
            "balance" numeric(12, 2) DEFAULT '0' NOT NULL,
            "is_main" boolean DEFAULT false NOT NULL
        )
    `;
    await sql`ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_users_unique_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("unique_id") ON DELETE no action ON UPDATE no action`;
    await sql`CREATE INDEX "wallet_user_id_idx" ON "wallet" USING btree ("user_id")`;

    // 7. Create sessions table
    console.log("Creating sessions table...");
    await sql`
        CREATE TABLE "sessions" (
            "session_id" text PRIMARY KEY NOT NULL,
            "user_id" varchar(50) NOT NULL,
            "has_approved" boolean DEFAULT false NOT NULL,
            "created_at" timestamp DEFAULT now()
        )
    `;
    await sql`ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_unique_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("unique_id") ON DELETE no action ON UPDATE no action`;
    await sql`CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id")`;

    // 8. Create transactions table
    console.log("Creating transactions table...");
    await sql`
        CREATE TABLE "transactions" (
            "id" serial PRIMARY KEY NOT NULL,
            "user_id" varchar(50) NOT NULL,
            "session_id" text,
            "amount" numeric(12, 2),
            "decision" text,
            "reason" text,
            "created_at" timestamp DEFAULT now()
        )
    `;
    await sql`CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id")`;
    await sql`CREATE INDEX "transactions_session_id_idx" ON "transactions" USING btree ("session_id")`;

    // 9. Create admin_control table
    console.log("Creating admin_control table...");
    await sql`
        CREATE TABLE "admin_control" (
            "unique_id" varchar(50) PRIMARY KEY NOT NULL,
            "allow_signin" boolean DEFAULT false,
            "created_at" timestamp DEFAULT now()
        )
    `;
    await sql`ALTER TABLE "admin_control" ADD CONSTRAINT "admin_control_unique_id_users_unique_id_fk" FOREIGN KEY ("unique_id") REFERENCES "users"("unique_id") ON DELETE cascade ON UPDATE no action`;

    // 10. Create messages table
    console.log("Creating messages table...");
    await sql`
        CREATE TABLE "messages" (
            "id" serial PRIMARY KEY NOT NULL,
            "unique_id" varchar(50),
            "user_message" text,
            "llm_message" text,
            "money_awarded" numeric(10, 2) DEFAULT '0',
            "created_at" timestamp DEFAULT now()
        )
    `;
    await sql`ALTER TABLE "messages" ADD CONSTRAINT "messages_unique_id_users_unique_id_fk" FOREIGN KEY ("unique_id") REFERENCES "users"("unique_id") ON DELETE cascade ON UPDATE no action`;

    // 11. Create bank_balance table
    console.log("Creating bank_balance table...");
    await sql`
        CREATE TABLE "bank_balance" (
            "id" serial PRIMARY KEY NOT NULL,
            "total_balance" numeric(12, 2) NOT NULL,
            "created_at" timestamp DEFAULT now()
        )
    `;

    console.log("\nMigration complete! All tables created successfully.");
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
