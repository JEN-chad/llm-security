CREATE TABLE IF NOT EXISTS "global_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_wins" integer DEFAULT 0,
	"security_level" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"has_approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_id" text,
	"amount" numeric(12, 2) DEFAULT '0',
	"decision" text,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"failed_attempts" integer DEFAULT 0,
	"failure_streak" integer DEFAULT 0,
	"wins" integer DEFAULT 0,
	"last_attempt_time" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"balance" numeric(12, 2) DEFAULT '0',
	"is_main" boolean DEFAULT false
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_sessions_user_id" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_sessions_session_id" ON "sessions" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_transactions_user_id" ON "transactions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_transactions_session_id" ON "transactions" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_users_username" ON "users" ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_wallet_user_id" ON "wallet" ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
