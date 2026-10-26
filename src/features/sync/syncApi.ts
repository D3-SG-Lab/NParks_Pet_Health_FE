/**
 * Offline capture and pending sync (FE-018, FE-011).
 *
 * MOCK: connectivity is simulated (toggle "Work offline" in the account sheet) and the outbox lives in
 * the in-memory store (src/mock/sync.ts). OUTSTANDING: a real network monitor (e.g. NetInfo), a local
 * SQLite outbox that survives restarts, background SAS uploads, and idempotent replay on the server.
 */
import type { SyncState } from '@/domain/types';
import { simulateLatency } from '@/mock/latency';
import { OfflineError, readSyncState, retryUpload, setOnline, startSync } from '@/mock/sync';

export { OfflineError };

export async function getSyncState(): Promise<SyncState> {
  await simulateLatency(0);
  return readSyncState();
}

export async function setWorkOffline(offline: boolean): Promise<SyncState> {
  await simulateLatency(0);
  setOnline(!offline);
  return readSyncState();
}

export async function syncNow(): Promise<SyncState> {
  await simulateLatency(0);
  startSync();
  return readSyncState();
}

export async function retrySyncItem(id: string): Promise<SyncState> {
  await simulateLatency(0);
  retryUpload(id);
  return readSyncState();
}