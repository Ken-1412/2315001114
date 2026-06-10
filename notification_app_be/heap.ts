import { Notification, NotificationType } from './types';
import { Log } from '../logging_middleware';

export interface PriorityItem {
    notification: Notification;
    priority: number;
}

const TYPE_WEIGHT: Record<NotificationType, number> = {
    placement: 3,
    result: 2,
    event: 1,
};

function recencyScore(createdAt: string): number {
    const age = Date.now() - new Date(createdAt).getTime();
    const hours = age / (1000 * 60 * 60);
    return Math.max(0, 10 - Math.log2(hours + 1));
}

function computePriority(n: Notification): number {
    const base = TYPE_WEIGHT[n.type] || 1;
    const recency = recencyScore(n.createdAt);
    return base + recency;
}

class MaxHeap {
    private heap: PriorityItem[] = [];

    private parent(i: number): number {
        return Math.floor((i - 1) / 2);
    }

    private left(i: number): number {
        return 2 * i + 1;
    }

    private right(i: number): number {
        return 2 * i + 2;
    }

    private swap(i: number, j: number): void {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }

    private siftUp(i: number): void {
        while (i > 0 && this.heap[this.parent(i)].priority < this.heap[i].priority) {
            this.swap(i, this.parent(i));
            i = this.parent(i);
        }
    }

    private siftDown(i: number): void {
        let max = i;
        const l = this.left(i);
        const r = this.right(i);
        if (l < this.heap.length && this.heap[l].priority > this.heap[max].priority) {
            max = l;
        }
        if (r < this.heap.length && this.heap[r].priority > this.heap[max].priority) {
            max = r;
        }
        if (max !== i) {
            this.swap(i, max);
            this.siftDown(max);
        }
    }

    push(item: PriorityItem): void {
        this.heap.push(item);
        this.siftUp(this.heap.length - 1);
    }

    pop(): PriorityItem | undefined {
        if (this.heap.length === 0) return undefined;
        const root = this.heap[0];
        const last = this.heap.pop()!;
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.siftDown(0);
        }
        return root;
    }

    peek(): PriorityItem | undefined {
        return this.heap[0];
    }

    size(): number {
        return this.heap.length;
    }

    topN(n: number): PriorityItem[] {
        const result: PriorityItem[] = [];
        const copy = new MaxHeap();
        for (const item of this.heap) {
            copy.push(item);
        }
        for (let i = 0; i < n && copy.size() > 0; i++) {
            const item = copy.pop()!;
            result.push(item);
        }
        return result;
    }
}

let globalHeap = new MaxHeap();

export function buildPriorityInbox(
    notifications: Notification[],
): void {
    Log(
        'backend',
        'info',
        'service',
        `heap: building from ${notifications.length} notifications`,
    );
    globalHeap = new MaxHeap();
    for (const n of notifications) {
        globalHeap.push({
            notification: n,
            priority: computePriority(n),
        });
    }
}

export function addToInbox(notification: Notification): void {
    globalHeap.push({
        notification,
        priority: computePriority(notification),
    });
}

export function getTopN(n: number = 10): PriorityItem[] {
    return globalHeap.topN(n);
}

export function getInboxSize(): number {
    return globalHeap.size();
}