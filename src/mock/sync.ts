/**
 * MOCK offline capture and ordered sync (stand-in for FE-018's local SQLite outbox and FE-011's
 * background uploads). Records made while offline are saved on the "device" (applied locally so the
 * screens update) and queued here. Back online, they are sent one at a time, in order.
 *
 * Progress is derived from timestamps when read (no timers), so it is deterministic in tests.
 */
import type { SyncItem, SyncState } from '@/domain/types';

import { AI_PROCESSING_MS } from './ai';
import { mockDb, newMockId, type OutboxEntry } from './db';

/** Time to send one record in the demo. */
export const UPLOAD_MS = process.env.NODE_ENV === 'test' ? 10 : 1600;

export class OfflineError extends Error {
  constructor() {
    super("You're offline. Records are saved on this device and sync when you're back online.");
    this.name = 'OfflineError';
  }
}

export function isOnline(): boolean {
  return mockDb.online;
}

/** Queues a record when offline. Returns true when it was queued (the caller saved it locally). */
export function queueIfOffline(entry: Omit<SyncItem, 'id' | 'status' | 'progress'> & { failOnce?: boolean }): boolean {
  if (mockDb.online) return false;
  mockDb.outbox.push({ ...entry, id: newMockId('sync'), status: 'waiting', progress: 0, startAt: null, failOnce: entry.failOnce ?? false });
  return true;
}

/** Called when a record reaches the server. Observations only start AI processing now. */
function onSynced(entry: OutboxEntry, at: number) {
  if (entry.kind !== 'observation') return;
  const observation = mockDb.observations.find((o) => o.id === entry.recordId);
  if (observation && observation.status === 'processing') observation.readyAt = at + AI_PROCESSING_MS;
}

/** Applies the passage of time to the outbox: uploads progress, complete (and leave) or fail. */
export function advanceSync(now: number = Date.now()): void {
  const remaining: OutboxEntry[] = [];
  for (const entry of mockDb.outbox) {
    if (entry.startAt === null || now < entry.startAt) {
      remaining.push({ ...entry, status: entry.status === 'failed' ? 'failed' : 'waiting', progress: 0 });
      continue;
    }
    const elapsed = now - entry.startAt;
    if (entry.failOnce && elapsed >= UPLOAD_MS / 2) {
      remaining.push({ ...entry, status: 'failed', progress: 0.5, startAt: null, failOnce: false });
      continue;
    }
    if (elapsed >= UPLOAD_MS) {
      onSynced(entry, entry.startAt + UPLOAD_MS);
      continue;
    }
    remaining.push({ ...entry, status: 'uploading', progress: elapsed / UPLOAD_MS });
  }
  mockDb.outbox = remaining;
}

/** Schedules every waiting record, one after another, starting now. */
export function startSync(now: number = Date.now()): void {
  if (!mockDb.online) throw new OfflineError();
  advanceSync(now);
  let next = Math.max(now, ...mockDb.outbox.map((e) => (e.startAt === null ? 0 : e.startAt + UPLOAD_MS)));
  for (const entry of mockDb.outbox) {
    if (entry.startAt !== null || entry.status === 'failed') continue;
    entry.startAt = next;
    next += UPLOAD_MS;
  }
}

/** Going offline pauses uploads; coming back online syncs automatically (in order). */
export function setOnline(online: boolean, now: number = Date.now()): void {
  advanceSync(now);
  mockDb.online = online;
  if (online) {
    startSync(now);
  } else {
    for (const entry of mockDb.outbox) {
      if (entry.status === 'uploading') entry.status = 'waiting';
      entry.startAt = null;
      entry.progress = 0;
    }
  }
}

/** Retries a failed upload after anything already scheduled. */
export function retryUpload(id: string, now: number = Date.now()): void {
  const entry = mockDb.outbox.find((e) => e.id === id);
  if (!entry) return;
  entry.status = 'waiting';
  entry.failOnce = false;
  entry.startAt = null;
  if (mockDb.online) startSync(now);
}

export function readSyncState(now: number = Date.now()): SyncState {
  advanceSync(now);
  return {
    online: mockDb.online,
    items: mockDb.outbox.map(({ startAt: _startAt, failOnce: _failOnce, ...item }) => item),
    syncing: mockDb.outbox.some((e) => e.startAt !== null),
  };
}