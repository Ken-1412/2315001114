import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Log } from '../logging_middleware';
import { CreateNotificationRequest, Notification, VALID_NOTIFICATION_TYPES } from './types';
import { getAllNotifications, getNotificationById, addNotification, markAsRead } from './store';
import { notificationEmitter } from './emitter';
import { invalidateCache } from './cache';

const router = Router();

router.post('/notifications', async (req: Request, res: Response) => {
    await Log('backend', 'info', 'route', 'POST /notifications: entry');
    const { type, title, message } = req.body as CreateNotificationRequest;

    if (!type || !title || !message) {
        await Log('backend', 'warn', 'route', 'POST /notifications: missing fields');
        res.status(400).json({ error: 'type, title, and message are required' });
        return;
    }

    if (!VALID_NOTIFICATION_TYPES.includes(type)) {
        await Log('backend', 'warn', 'route', `POST /notifications: invalid type=${type}`);
        res.status(400).json({ error: `type must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}` });
        return;
    }

    try {
        const notification: Notification = {
            id: randomUUID(),
            type,
            title,
            message,
            isRead: false,
            createdAt: new Date().toISOString(),
        };

        const saved = await addNotification(notification);
        invalidateCache('notifications:');
        notificationEmitter.emit('new', saved);
        await Log('backend', 'info', 'route', `POST /notifications: exit success id=${saved.id}`);
        res.status(201).json(saved);
    } catch (err: any) {
        await Log('backend', 'error', 'route', `POST /notifications: error: ${err.message}`);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

router.get('/notifications', async (req: Request, res: Response) => {
    await Log('backend', 'info', 'route', 'GET /notifications: entry');
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

        const result = await getAllNotifications(page, limit);
        await Log('backend', 'info', 'route', `GET /notifications: exit success count=${result.notifications.length}`);
        res.json({
            notifications: result.notifications,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit),
            },
        });
    } catch (err: any) {
        await Log('backend', 'error', 'route', `GET /notifications: error: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

router.get('/notifications/stream', async (req: Request, res: Response) => {
    await Log('backend', 'info', 'route', 'GET /notifications/stream: client connected');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onNew = (notification: Notification) => {
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
    };

    notificationEmitter.on('new', onNew);

    req.on('close', async () => {
        notificationEmitter.off('new', onNew);
        await Log('backend', 'info', 'route', 'GET /notifications/stream: client disconnected');
    });
});

router.get('/notifications/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    await Log('backend', 'info', 'route', `GET /notifications/${id}: entry`);
    try {
        const notification = await getNotificationById(id);

        if (!notification) {
            await Log('backend', 'warn', 'route', `GET /notifications/${id}: not found`);
            res.status(404).json({ error: 'Notification not found' });
            return;
        }

        await Log('backend', 'info', 'route', `GET /notifications/${id}: exit success`);
        res.json(notification);
    } catch (err: any) {
        await Log('backend', 'error', 'route', `GET /notifications/${id}: error: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch notification' });
    }
});

router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
    const { id } = req.params;
    await Log('backend', 'info', 'route', `PATCH /notifications/${id}/read: entry`);
    try {
        const notification = await markAsRead(id);

        if (!notification) {
            await Log('backend', 'warn', 'route', `PATCH /notifications/${id}/read: not found`);
            res.status(404).json({ error: 'Notification not found' });
            return;
        }

        await Log('backend', 'info', 'route', `PATCH /notifications/${id}/read: exit success`);
        res.json(notification);
    } catch (err: any) {
        await Log('backend', 'error', 'route', `PATCH /notifications/${id}/read: error: ${err.message}`);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

export default router;
