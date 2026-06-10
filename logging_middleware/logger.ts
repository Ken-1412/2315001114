import 'dotenv/config';
import { LogPayload, LogLevel, LogStack, LogPackage, VALID_LEVELS, VALID_STACKS, VALID_PACKAGES } from './types';

const LOG_URL = `${process.env.TEST_SERVER_BASE_URL}/evaluation-service/logs`;

function validatePayload(payload: LogPayload): void {
    if (!VALID_STACKS.includes(payload.stack)) {
        throw new Error(`Invalid stack: ${payload.stack}. Must be one of ${VALID_STACKS.join(', ')}`);
    }
    if (!VALID_LEVELS.includes(payload.level)) {
        throw new Error(`Invalid level: ${payload.level}. Must be one of ${VALID_LEVELS.join(', ')}`);
    }
    if (!VALID_PACKAGES.includes(payload.package)) {
        throw new Error(`Invalid package: ${payload.package}. Must be one of ${VALID_PACKAGES.join(', ')}`);
    }
}

async function sendLog(payload: LogPayload): Promise<boolean> {
    try {
        const token = process.env.BEARER_TOKEN;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(LOG_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function Log(payload: LogPayload): Promise<void>;
export async function Log(stack: string, level: string, pkg: string, message: string): Promise<void>;
export async function Log(
    stackOrPayload: LogPayload | string,
    level?: string,
    pkg?: string,
    message?: string
): Promise<void> {
    try {
        let payload: LogPayload;
        if (typeof stackOrPayload === 'string') {
            payload = {
                stack: stackOrPayload as LogStack,
                level: (level?.toLowerCase() ?? 'info') as LogLevel,
                package: (pkg ?? '') as LogPackage,
                message: message ?? '',
            };
        } else {
            payload = stackOrPayload;
        }
        validatePayload(payload);
        const ok = await sendLog(payload);
        if (!ok) {
            await sendLog(payload);
        }
    } catch {
        // fail silently
    }
}