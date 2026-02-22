import {
  pgTable,
  varchar,
  boolean,
  numeric,
  timestamp,
  serial,
  text
} from "drizzle-orm/pg-core";

export const participants = pgTable("participants", {
  uniqueId: varchar("unique_id", { length: 50 }).primaryKey(),
  teamName: varchar("team_name", { length: 100 }),
  member1: varchar("member1", { length: 100 }),
  member2: varchar("member2", { length: 100 }),
  walletBalance: numeric("wallet_balance", { precision: 12, scale: 2 }).default("0"),
  isOnline: boolean("is_online").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});


export const adminControl = pgTable("admin_control", {
  uniqueId: varchar("unique_id", { length: 50 })
    .primaryKey()
    .references(() => participants.uniqueId, { onDelete: "cascade" }),
  allowSignin: boolean("allow_signin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});



export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  uniqueId: varchar("unique_id", { length: 50 })
    .references(() => participants.uniqueId, { onDelete: "cascade" }),
  userMessage: text("user_message"),
  llmMessage: text("llm_message"),
  moneyAwarded: numeric("money_awarded", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});



export const bankBalance = pgTable("bank_balance", {
  id: serial("id").primaryKey(),
  totalBalance: numeric("total_balance", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
