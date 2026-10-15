import type { ItemLookupDto } from "@/features/transactions/types";

/**
 * localStorage-backed store for offline billing: a cached item list (so the
 * counter can bill without network) and a queue of captured sales waiting to be
 * posted to the server when the connection returns.
 */

const ITEMS_KEY = "agri.offline.items.v1";
const QUEUE_KEY = "agri.offline.queue.v1";

export interface CachedItems {
  items: ItemLookupDto[];
  cachedAt: number;
}

export interface OfflineLine {
  itemId: number;
  itemCode: string;
  itemName: string;
  unitCode: string;
  gstPercent: number;
  quantity: number;
  rate: number;
}

export type PendingStatus = "pending" | "error";

export interface PendingSale {
  localId: string;
  capturedAt: number;
  walkInName?: string;
  walkInMobile?: string;
  paymentType: "Cash" | "Credit";
  lines: OfflineLine[];
  total: number;
  status: PendingStatus;
  error?: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode - ignore */
  }
}

/* --------------------------------- items --------------------------------- */

export function readItemsCache(): CachedItems | null {
  return read<CachedItems | null>(ITEMS_KEY, null);
}

export function writeItemsCache(items: ItemLookupDto[]) {
  write(ITEMS_KEY, { items, cachedAt: Date.now() } satisfies CachedItems);
}

/* --------------------------------- queue --------------------------------- */

export function readQueue(): PendingSale[] {
  return read<PendingSale[]>(QUEUE_KEY, []);
}

export function writeQueue(queue: PendingSale[]) {
  write(QUEUE_KEY, queue);
}

export function addToQueue(sale: PendingSale) {
  const q = readQueue();
  q.push(sale);
  writeQueue(q);
}

export function removeFromQueue(localId: string) {
  writeQueue(readQueue().filter((s) => s.localId !== localId));
}

export function updateQueueItem(localId: string, patch: Partial<PendingSale>) {
  writeQueue(readQueue().map((s) => (s.localId === localId ? { ...s, ...patch } : s)));
}

export function newLocalId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `off-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
