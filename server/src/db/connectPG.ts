import { Pool } from 'pg';

export const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PG_PASSWORD,//if connection failed then try direct password hard coded without .env becuase here password required string
    port: Number(process.env.PG_PORT)
});

export const connectDB = async (): Promise<void> => {
    try {
        const connectionInstance = await pool.connect();
        console.log(`PostgreSQL connected succesfully`);
        connectionInstance.release();
    } catch (error) {
        console.log(`postgresDB connection failed due to ${error}`);
    }
}