import { Pool } from 'pg';
import { Log } from '../logging_middleware';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'notifications',
});

pool.on('connect', () => {
    Log('backend', 'info', 'db', 'pool: client connected');
});

pool.on('error', (err) => {
    Log('backend', 'error', 'db', `pool: unexpected error: ${err.message}`);
});

export default pool;
