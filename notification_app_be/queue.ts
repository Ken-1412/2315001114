import { Notification } from './types';
import { Log } from '../logging_middleware';

interface QueueItem {
    id: string;
    notification: Notification;
    recipients: string[];
    attempt: number;
    maxRetries: number;
    lastError?: string;
}

const queue: QueueItem[] = [];
const deadLetter: QueueItem[] = [];
let processing = false;

async function deliver(
    notification: Notification,
    recipient: string,
): Promise<boolean> {
    await Log(
        'backend',
        'info',
        'handler',
        `queue.deliver: attempt for ${notification.id} to ${recipient}`,
    );
    if (Math.random() < 0.05) {
        throw new Error(`simulated delivery failure to ${recipient}`);
    }
    return true;
}

function backoff(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
}

async function processQueue(): Promise<void> {
    if (processing || queue.length === 0) return;
    processing = true;

    while (queue.length > 0) {
        const item = queue.shift()!;
        await Log(
            'backend',
            'info',
            'handler',
            `queue: dequeue ${item.id} attempt=${item.attempt}`,
        );

        let allOk = true;
        for (const recipient of item.recipients) {
            try {
                await deliver(item.notification, recipient);
                await Log(
                    'backend',
                    'info',
                    'handler',
                    `queue: delivered ${item.id} to ${recipient}`,
                );
            } catch (err: any) {
                allOk = false;
                item.lastError = err.message;
                await Log(
                    'backend',
                    'warn',
                    'handler',
                    `queue: failed ${item.id} to ${recipient}: ${err.message}`,
                );
            }
        }

        if (!allOk) {
            item.attempt++;
            if (item.attempt < item.maxRetries) {
                const delay = backoff(item.attempt);
                await Log(
                    'backend',
                    'info',
                    'handler',
                    `queue: retry ${item.id} in ${delay}ms (attempt ${item.attempt})`,
                );
                await new Promise((r) => setTimeout(r, delay));
                queue.push(item);
            } else {
                deadLetter.push(item);
                await Log(
                    'backend',
                    'error',
                    'handler',
                    `queue: DLQ ${item.id} after ${item.maxRetries} attempts: ${item.lastError}`,
                );
            }
        }
    }

    processing = false;
}

export function enqueue(
    notifications: Notification[],
    recipients: string[],
): void {
    for (const n of notifications) {
        const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        queue.push({
            id,
            notification: n,
            recipients,
            attempt: 0,
            maxRetries: 3,
        });
        Log(
            'backend',
            'info',
            'handler',
            `queue: enqueue ${id} notification=${n.id}`,
        );
    }
    processQueue();
}

export function getQueueStatus(): {
    queued: number;
    deadLetter: number;
} {
    return { queued: queue.length, deadLetter: deadLetter.length };
}

export function getDeadLetters(): QueueItem[] {
    return [...deadLetter];
}

export function retryDeadLetter(id: string): boolean {
    const idx = deadLetter.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    const item = deadLetter.splice(idx, 1)[0];
    item.attempt = 0;
    queue.push(item);
    processQueue();
    return true;
}