import {
    pgTable,
    serial,
    integer,
    text,
    boolean,
    timestamp,
    numeric,
    varchar,
    index,
} from "drizzle-orm/pg-core";


// ========================
// USERS TABLE
// ========================
export const users = pgTable(
    "users",
    {
        // replacing username with uniqueId
        uniqueId: varchar("unique_id", { length: 50 }).primaryKey(),

        // participant fields
        teamName: varchar("team_name", { length: 100 }),
        member1: varchar("member1", { length: 100 }),
        member2: varchar("member2", { length: 100 }),
        walletBalance: numeric("wallet_balance", {
            precision: 12,
            scale: 2,
        }).default("0"),
        isOnline: boolean("is_online").default(false),
        createdAt: timestamp("created_at").defaultNow(),

        // existing user fields
        failedAttempts: integer("failed_attempts").default(0).notNull(),
        wins: integer("wins").default(0).notNull(),
        lastAttemptTime: timestamp("last_attempt_time").defaultNow(),
    }
);


// ========================
// GLOBAL STATS TABLE
// ========================
export const globalStats = pgTable("global_stats", {
    id: serial("id").primaryKey(),
    totalWins: integer("total_wins").default(0).notNull(),
    securityLevel: integer("security_level").default(1).notNull(),
});


// ========================
// WALLET TABLE
// ========================
export const wallet = pgTable(
    "wallet",
    {
        id: serial("id").primaryKey(),
        userId: varchar("user_id", { length: 50 }).references(() => users.uniqueId),
        balance: numeric("balance", { precision: 12, scale: 2 }).default("0").notNull(),
        isMain: boolean("is_main").default(false).notNull(),
    },
    (table) => ({
        userIdIdx: index("wallet_user_id_idx").on(table.userId),
    })
);


// ========================
// SESSIONS TABLE
// ========================
export const sessions = pgTable(
    "sessions",
    {
        sessionId: text("session_id").primaryKey(),
        userId: varchar("user_id", { length: 50 })
            .references(() => users.uniqueId)
            .notNull(),
        hasApproved: boolean("has_approved").default(false).notNull(),
        createdAt: timestamp("created_at").defaultNow(),
    },
    (table) => ({
        userIdIdx: index("sessions_user_id_idx").on(table.userId),
    })
);


// ========================
// TRANSACTIONS TABLE
// ========================
export const transactions = pgTable(
    "transactions",
    {
        id: serial("id").primaryKey(),
        userId: varchar("user_id", { length: 50 }).notNull(),
        sessionId: text("session_id"),
        amount: numeric("amount", { precision: 12, scale: 2 }),
        decision: text("decision"),
        reason: text("reason"),
        createdAt: timestamp("created_at").defaultNow(),
    },
    (table) => ({
        userIdIdx: index("transactions_user_id_idx").on(table.userId),
        sessionIdIdx: index("transactions_session_id_idx").on(table.sessionId),
    })
);


// =======================================================
// SYMPOSIUM COMPETITION SYSTEM TABLES
// =======================================================



// ========================
// ADMIN CONTROL TABLE
// ========================
export const adminControl = pgTable("admin_control", {
    uniqueId: varchar("unique_id", { length: 50 })
        .primaryKey()
        .references(() => users.uniqueId, { onDelete: "cascade" }),
    allowSignin: boolean("allow_signin").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});


// ========================
// MESSAGES TABLE
// ========================
export const messages = pgTable("messages", {
    id: serial("id").primaryKey(),
    uniqueId: varchar("unique_id", { length: 50 })
        .references(() => users.uniqueId, { onDelete: "cascade" }),
    userMessage: text("user_message"),
    llmMessage: text("llm_message"),
    moneyAwarded: numeric("money_awarded", { precision: 10, scale: 2 }).default("0"),
    createdAt: timestamp("created_at").defaultNow(),
});


// ========================
// CENTRAL BANK TABLE
// ========================
export const bankBalance = pgTable("bank_balance", {
    id: serial("id").primaryKey(),
    totalBalance: numeric("total_balance", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});


// ========================
// HEIST HISTORY TABLE
// ========================
export const heistHistory = pgTable("heist_history", {
    id: serial("id").primaryKey(),
    uniqueId: varchar("unique_id", { length: 50 })
        .references(() => users.uniqueId, { onDelete: "cascade" }),
    teamName: varchar("team_name", { length: 100 }),
    moneyTaken: numeric("money_taken", { precision: 12, scale: 2 }).notNull(),
    bankBalanceAfter: numeric("bank_balance_after", { precision: 12, scale: 2 }).notNull(),
    userMessage: text("user_message"),
    createdAt: timestamp("created_at").defaultNow(),
});