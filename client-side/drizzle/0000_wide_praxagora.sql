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
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"unique_id" varchar(50),
	"user_message" text,
	"llm_message" text,
	"money_awarded" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"unique_id" varchar(50) PRIMARY KEY NOT NULL,
	"team_name" varchar(100),
	"member1" varchar(100),
	"member2" varchar(100),
	"wallet_balance" numeric(12, 2) DEFAULT '0',
	"is_online" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_control" ADD CONSTRAINT "admin_control_unique_id_participants_unique_id_fk" FOREIGN KEY ("unique_id") REFERENCES "public"."participants"("unique_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_unique_id_participants_unique_id_fk" FOREIGN KEY ("unique_id") REFERENCES "public"."participants"("unique_id") ON DELETE cascade ON UPDATE no action;