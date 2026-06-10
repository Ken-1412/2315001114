import pool from './db';
import { Notification } from './types';
import { Log } from '../logging_middleware';
import { getCache, setCache, invalidateCache } from './cache';

export async function getAllNotifications(
    page: number = 1,
    limit: number = 20
): Promise<{ notifications: Notification[]; total: number }> {
    await Log('backend', 'info', 'repository', `store.getAllNotifications: page=${page}, limit=${limit}`);
    const cacheKey = `notifications:page=${page}:limit=${limit}`;
    const cached = getCache(cacheKey);
    if (cached) {
        await Log('backend', 'info', 'repository', 'store.getAllNotifications: cache hit');
        return JSON.parse(cached);
    }

    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM notifications');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
        'SELECT id, type, title, message, is_read AS "isRead", created_at AS "createdAt" FROM notifications ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
    );

    const data = { notifications: result.rows, total };
    setCache(cacheKey, JSON.stringify(data), 30000);

    await Log('backend', 'info', 'repository', `store.getAllNotifications: returned ${result.rows.length} of ${total}`);
    return data;
}

export async function getNotificationById(id: string): Promise<Notification | null> {
    await Log('backend', 'info', 'repository', `store.getNotificationById: id=${id}`);
    const result = await pool.query(
        'SELECT id, type, title, message, is_read AS "isRead", created_at AS "createdAt" FROM notifications WHERE id = $1',
        [id]
    );
    if (result.rows.length === 0) {
        await Log('backend', 'warn', 'repository', `store.getNotificationById: not found id=${id}`);
        return null;
    }
    await Log('backend', 'info', 'repository', `store.getNotificationById: found id=${id}`);
    return result.rows[0];
}

export async function addNotification(notification: Notification): Promise<Notification> {
    await Log('backend', 'info', 'repository', `store.addNotification: id=${notification.id}`);
    const result = await pool.query(
        'INSERT INTO notifications (id, type, title, message, is_read, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, type, title, message, is_read AS "isRead", created_at AS "createdAt"',
        [notification.id, notification.type, notification.title, notification.message, notification.isRead, notification.createdAt]
    );
    await Log('backend', 'info', 'repository', `store.addNotification: inserted id=${notification.id}`);
    return result.rows[0];
}

export async function markAsRead(id: string): Promise<Notification | null> {
    await Log('backend', 'info', 'repository', `store.markAsRead: id=${id}`);
    const result = await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING id, type, title, message, is_read AS "isRead", created_at AS "createdAt"',
        [id]
    );
    if (result.rows.length === 0) {
        await Log('backend', 'warn', 'repository', `store.markAsRead: not found id=${id}`);
        return null;
    }
    await Log('backend', 'info', 'repository', `store.markAsRead: updated id=${id}`);
    return result.rows[0];
}
