import { useCallback, useEffect, useRef, useState } from 'react';

import type { MediaItem, MediaKind } from '@/domain/types';

export type UploadState = 'uploading' | 'uploaded' | 'failed';

export interface UploadItem extends MediaItem {
  state: UploadState;
  /** 0..1. */
  progress: number;
}

const TICK_MS = 250;
const STEP = 0.15;
/** The demo fails one upload (the third added) on its first attempt, so Retry can be shown. */
const DEMO_FAILURE_INDEX = 3;

let uploadCounter = 0;

/**
 * MOCK upload manager (stand-in for FE-011). Simulates background upload progress, a failure and
 * retry. OUTSTANDING: real capture (camera/gallery), on-device compression, upload through SAS URLs
 * (BE-013) that survives backgrounding and resumes after the app is reopened.
 */
export function useMockUploads() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setInterval>>());
  const added = useRef(0);

  const stop = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearInterval(timer);
    timers.current.delete(id);
  }, []);

  const run = useCallback(
    (id: string, failAt: number | null) => {
      stop(id);
      const timer = setInterval(() => {
        setItems((list) =>
          list.map((item) => {
            if (item.id !== id || item.state !== 'uploading') return item;
            const progress = Math.min(item.progress + STEP, 1);
            if (failAt !== null && progress >= failAt) {
              stop(id);
              return { ...item, state: 'failed', progress };
            }
            if (progress >= 1) {
              stop(id);
              return { ...item, state: 'uploaded', progress: 1 };
            }
            return { ...item, progress };
          }),
        );
      }, TICK_MS);
      timers.current.set(id, timer);
    },
    [stop],
  );

  const add = useCallback(
    (kind: MediaKind) => {
      added.current += 1;
      uploadCounter += 1;
      const id = `upload-${uploadCounter}`;
      const item: UploadItem = { id, kind, durationSec: kind === 'video' ? 12 : undefined, state: 'uploading', progress: 0 };
      setItems((list) => [...list, item]);
      run(id, added.current === DEMO_FAILURE_INDEX ? 0.6 : null);
    },
    [run],
  );

  const retry = useCallback(
    (id: string) => {
      setItems((list) => list.map((item) => (item.id === id ? { ...item, state: 'uploading', progress: 0 } : item)));
      run(id, null);
    },
    [run],
  );

  const remove = useCallback(
    (id: string) => {
      stop(id);
      setItems((list) => list.filter((item) => item.id !== id));
    },
    [stop],
  );

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((timer) => clearInterval(timer));
      active.clear();
    };
  }, []);

  return { items, add, retry, remove };
}