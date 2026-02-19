import { pgTable, serial, text, integer, boolean, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Represents the 'users' table
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    failedAttempts: integer("failed_attempts").default(0),
    failureStreak: integer("failure_streak").default(0),
    wins: integer("wins").default(0),
    lastAttemptTime: timestamp("last_attempt_time").defaultNow(),
}, (table) => {
    return {
        usernameIdx: index("ix_users_username").on(table.username),
        // Using default index naming from SQLAlchemy usually results in ix_table_column or similar, 
        // but Drizzle might generate different names. 
        // We try to keep it simple. The goal is to have the index.
    };
});

export const usersRelations = relations(users, ({ many }) => ({
    wallets: many(wallet),
    transactions: many(transactions),
}));

// Represents the 'global_stats' table
export const globalStats = pgTable("global_stats", {
    id: serial("id").primaryKey(),
    totalWins: integer("total_wins").default(0),
    securityLevel: integer("security_level").default(1),
});

// Represents the 'wallet' table
export const wallet = pgTable("wallet", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    balance: numeric("balance", { precision: 12, scale: 2 }).default("0"),
    isMain: boolean("is_main").default(false),
}, (table) => {
    return {
        userIdIdx: index("ix_wallet_user_id").on(table.userId),
    };
});

export const walletRelations = relations(wallet, ({ one }) => ({
    user: one(users, {
        fields: [wallet.userId],
        references: [users.id],
    }),
}));

// Represents the 'sessions' table
export const sessions = pgTable("sessions", {
    sessionId: text("session_id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    hasApproved: boolean("has_approved").default(false),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
    return {
        // SQLAlchemy: session_id = Column(String, primary_key=True, index=True)
        // Primary key usually has an index, but explicit index requested? 
        // SQLAlchemy creates index for PK? Usually PK constraint is enough.
        // user_id = Column(Integer, ForeignKey("users.id"), index=True)
        userIdIdx: index("ix_sessions_user_id").on(table.userId),
        sessionIdIdx: index("ix_sessions_session_id").on(table.sessionId),
    };
});

// Represents the 'transactions' table
export const transactions = pgTable("transactions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    sessionId: text("session_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }).default("0"),
    decision: text("decision"),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
    return {
        userIdIdx: index("ix_transactions_user_id").on(table.userId),
        sessionIdIdx: index("ix_transactions_session_id").on(table.sessionId),
    };
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
    user: one(users, {
        fields: [transactions.userId],
        references: [users.id],
    }),
}));
