const store = new Map<string, { data: string; expiry: number }>();

export function getCache(key: string): string | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
        store.delete(key);
        return null;
    }
    return entry.data;
}

export function setCache(key: string, data: string, ttlMs: number = 30000): void {
    store.set(key, { data, expiry: Date.now() + ttlMs });
}

export function invalidateCache(pattern: string): void {
    for (const key of store.keys()) {
        if (key.startsWith(pattern)) {
            store.delete(key);
        }
    }
}

export function clearCache(): void {
    store.clear();
}