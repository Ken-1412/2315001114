import pool from './db';
import { Log } from '../logging_middleware';

export async function migrate(): Promise<void> {
    await Log('backend', 'info', 'db', 'migrate: start');
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                type VARCHAR(20) NOT NULL CHECK (type IN ('placement', 'event', 'result')),
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await Log('backend', 'info', 'db', 'migrate: table created');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_type_created_read
            ON notifications (type, created_at DESC, is_read);
        `);
        await Log('backend', 'info', 'db', 'migrate: indexes created');
    } catch (err: any) {
        await Log('backend', 'error', 'db', `migrate: error: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
    await Log('backend', 'info', 'db', 'migrate: done');
}
