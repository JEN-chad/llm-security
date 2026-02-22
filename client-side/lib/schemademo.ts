import {
    pgTable,
    serial,
    integer,
    text,
    boolean,
    timestamp,
    numeric,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

// ========================
// USERS TABLE
// ========================
export const users = pgTable(
    "users",
    {
        id: serial("id").primaryKey(),
        username: text("username").notNull(),
        failedAttempts: integer("failed_attempts").default(0).notNull(),
        wins: integer("wins").default(0).notNull(),
        lastAttemptTime: timestamp("last_attempt_time").defaultNow(),
    },
    (table) => ({
        usernameUniqueIdx: uniqueIndex("users_username_idx").on(table.username),
    })
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
        userId: integer("user_id").references(() => users.id),
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
        userId: integer("user_id")
            .references(() => users.id)
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
        userId: integer("user_id").notNull(),
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