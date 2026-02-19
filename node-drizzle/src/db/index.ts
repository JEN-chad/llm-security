import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
}

let useSSL = false;
try {
    const u = new URL(process.env.DATABASE_URL);
    console.log("DB host:", u.hostname, "DB name:", u.pathname.replace("/", ""));
    useSSL = u.hostname !== "postgres" || u.hostname.includes("neon.tech");
} catch {
    console.log("DB URL:", process.env.DATABASE_URL);
}

const client = new Client(
    useSSL
        ? {
              connectionString: process.env.DATABASE_URL,
              ssl: { rejectUnauthorized: false },
          }
        : {
              connectionString: process.env.DATABASE_URL,
          }
);

const connectDB = async () => {
    try {
        await client.connect();
        console.log("✅ Database connected successfully");
    } catch (error) {
        console.error("❌ Database connection failed", error);
        process.exit(1);
    }
};

connectDB();

export const db = drizzle(client, { schema });
