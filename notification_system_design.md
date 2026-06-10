# Notification System Design

## Overview
Two microservices:
1. Vehicle Maintenance Scheduler (Knapsack optimization) — Port 3001
2. Campus Notifications System (REST + SSE + Priority Inbox) — Port 3002

## Architecture
- Node.js + TypeScript
- Express REST APIs
- PostgreSQL for persistence (Stage 4)
- In-memory caching with TTL (Stage 5)
- In-process queue with retry/DLQ (Stage 6)
- Max-heap priority inbox (Stage 7)
- Server-Sent Events (SSE) for real-time push
- Custom Log() middleware for all operations

## API Endpoints

### Vehicle Maintenance Scheduler (Port 3001)
| Method | Path | Description |
|--------|------|-------------|
| GET | /depots | List all depots from test server |
| GET | /depots/:id/vehicles | List vehicles for a depot |
| POST | /schedule | Schedule maintenance with budget (Knapsack DP) |

### Notification System (Port 3002)
| Method | Path | Description |
|--------|------|-------------|
| POST | /notifications | Create notification → DB + cache invalidate + SSE broadcast |
| GET | /notifications | List notifications (paginated, cache-first) |
| GET | /notifications/:id | Get notification by ID |
| PATCH | /notifications/:id/read | Mark as read |
| GET | /notifications/stream | SSE real-time stream |

## Data Flow
1. Incoming notification → POST /notifications → Store in DB → Cache invalidate → SSE broadcast
2. Bulk delivery → Enqueue → Process with retry/DLQ
3. Priority Inbox → Fetch all → Max-heap → Top N by priority score

## Stage 5 — Performance
- **Composite Index**: `idx_notifications_type_created_read ON notifications (type, created_at DESC, is_read)` for efficient filtered queries
- **In-Memory Cache** (`cache.ts`): Map-based key-value store with TTL (default 30s)
  - `getCache(key)` — returns cached string or null if expired
  - `setCache(key, data, ttlMs)` — stores with expiry timestamp
  - `invalidateCache(pattern)` — prefix-match deletion
- **Cache Integration**: `getAllNotifications()` checks cache before DB; POST handler invalidates via `invalidateCache('notifications:')`

## Stage 6 — Reliability (`queue.ts`)
- **In-Process Queue**: Array-based queue processing items sequentially
- **Exponential Backoff**: Retry delay = `min(1000 * 2^attempt, 30000)` ms
- **Max Retries**: 3 attempts per item before moving to Dead Letter Queue
- **Simulated Failure**: 5% random failure rate for testing retry logic
- **Dead Letter Queue**: Failed items stored with error info for manual inspection/retry
- **Functions**:
  - `enqueue(notifications, recipients)` — push items and start processing
  - `getQueueStatus()` — pending/in-progress/failed/DLQ counts
  - `getDeadLetters()` — list all DLQ items
  - `retryDeadLetter(id)` — move DLQ item back to main queue

## Stage 7 — Priority Inbox (`heap.ts`)
- **Max-Heap**: Complete binary heap implementation (siftUp, siftDown, push, pop, peek)
- **Priority Score** = `TYPE_WEIGHT[type] + recencyScore(createdAt)`
  - Type weights: placement=3, result=2, event=1
  - Recency score: `max(0, 10 - log2(hours_since_created + 1))` (logarithmic decay)
- **Functions**:
  - `buildPriorityInbox(notifications)` — build heap from array
  - `addToInbox(notification)` — push single item
  - `getTopN(n=10)` — extract top N by priority (non-destructive via copy)
  - `getInboxSize()` — current heap size

## Authentication
Bearer token auth on all test server API calls via `Authorization` header.