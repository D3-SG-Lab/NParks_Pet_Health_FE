import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 600;

/**
 * Debounced autosave. Saves `value` shortly after it stops changing, but only once `dirty` is true,
 * so opening a screen never writes an empty draft. Pending changes are flushed when the screen
 * unmounts, and `flush()` lets "Save draft" write immediately.
 */
export function useAutosave<T>(value: T, dirty: boolean, save: (value: T) => Promise<unknown>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const saveRef = useRef(save);
  const latest = useRef(value);
  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const cancelled = useRef(false);

  const run = useCallback(async () => {
    if (cancelled.current) return;
    pending.current = false;
    if (mounted.current) setStatus('saving');
    try {
      await saveRef.current(latest.current);
      if (mounted.current) setStatus('saved');
    } catch {
      if (mounted.current) setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!dirty) return;
    pending.current = true;
    const timer = setTimeout(() => void run(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value, dirty, run]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pending.current) void saveRef.current(latest.current);
    };
  }, []);

  /** Writes any pending change now and resolves when done. */
  const flush = useCallback(async () => {
    pending.current = false;
    setStatus('saving');
    try {
      await saveRef.current(latest.current);
      setStatus('saved');
    } catch (error) {
      setStatus('error');
      throw error;
    }
  }, []);

  /** Drops pending and future saves, e.g. after the draft was submitted and deleted. */
  const cancel = useCallback(() => {
    cancelled.current = true;
    pending.current = false;
  }, []);

  return { status, flush, cancel };
}
