import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function verify() {
    console.log("=== DATABASE VERIFICATION ===\n");

    // 1. Check all tables exist
    const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    `;
    console.log("Tables in database:");
    tables.forEach((t: any) => console.log(`  - ${t.table_name}`));

    // 2. Check users count
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`\nUsers count: ${userCount[0].count}`);

    // 3. Check admin_control count
    const adminCount = await sql`SELECT COUNT(*) as count FROM admin_control`;
    console.log(`Admin control count: ${adminCount[0].count}`);

    // 4. Check a sample user
    const sample = await sql`SELECT * FROM users WHERE unique_id = 'SYSCONZ01'`;
    console.log(`\nSample user (SYSCONZ01):`, JSON.stringify(sample[0], null, 2));

    // 5. Check foreign keys
    const fkeys = await sql`
        SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name
    `;
    console.log("\nForeign key relationships:");
    fkeys.forEach((fk: any) => {
        console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    console.log("\n=== VERIFICATION COMPLETE ===");
}

verify().catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
});
