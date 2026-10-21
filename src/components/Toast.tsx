import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { FadeIn } from './FadeIn';
import { Icon } from './Icon';

export type ToastKind = 'success' | 'info' | 'error';

interface ToastState {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_DURATION_MS = 4000;

/** Provides `useToast()` and renders the current toast above the screen content. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    counter.current += 1;
    setToast({ id: counter.current, kind, message });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api = useMemo(() => ({ show }), [show]);
  const icon = toast?.kind === 'success' ? 'checkmark-circle' : toast?.kind === 'error' ? 'alert-circle' : 'information-circle';

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.host, { top: insets.top + theme.spacing.lg }]}>
          <FadeIn key={toast.id}>
            <View
              testID="toast"
              accessible
              accessibilityRole={toast.kind === 'error' ? 'alert' : 'text'}
              accessibilityLiveRegion={toast.kind === 'error' ? 'assertive' : 'polite'}
              accessibilityLabel={toast.message}
              style={[styles.toast, toast.kind === 'error' && styles.error]}
            >
              <Icon name={icon} color={theme.colors.surface} />
              <AppText style={styles.text}>{toast.message}</AppText>
            </View>
          </FadeIn>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside <ToastProvider>.');
  return value;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    maxWidth: theme.control.formMaxWidth,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.text,
    shadowColor: theme.colors.shadow,
    shadowOpacity: theme.elevation.card.shadowOpacity * 3,
    shadowRadius: theme.elevation.card.shadowRadius,
    shadowOffset: { width: 0, height: theme.elevation.card.shadowOffsetY },
    elevation: theme.elevation.card.elevation * 3,
  },
  error: { backgroundColor: theme.colors.danger },
  text: { color: theme.colors.surface, flexShrink: 1 },
});
