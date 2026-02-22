CREATE TABLE "admin_control" (
	"unique_id" varchar(50) PRIMARY KEY NOT NULL,
	"allow_signin" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_balance" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_balance" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "global_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_wins" integer DEFAULT 0 NOT NULL,
	"security_level" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heist_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"unique_id" varchar(50),
	"team_name" varchar(100),
	"money_taken" numeric(12, 2) NOT NULL,
	"bank_balance_after" numeric(12, 2) NOT NULL,
	"user_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"unique_id" varchar(50),
	"user_message" text,
	"llm_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"has_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"session_id" text,
	"amount" numeric(12, 2),
	"decision" text,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(50),
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_control" ADD CONSTRAINT "admin_control_unique_id_users_unique_id_fk" FOREIGN KEY ("unique_id") REFERENCES "public"."users"("unique_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heist_history" ADD CONSTRAINT "heist_history_unique_id_users_unique_id_fk" FOREIGN KEY ("unique_id") REFERENCES "public"."users"("unique_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_unique_id_users_unique_id_fk" FOREIGN KEY ("unique_id") REFERENCES "public"."users"("unique_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_unique_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("unique_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_users_unique_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("unique_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_session_id_idx" ON "transactions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "wallet_user_id_idx" ON "wallet" USING btree ("user_id");