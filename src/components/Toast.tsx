import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shadow, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { FadeIn } from './FadeIn';
import { Icon } from './Icon';

export type ToastKind = 'success' | 'info' | 'error';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastState {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

interface ToastApi {
  show: (message: string, kind?: ToastKind, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_DURATION_MS = 4000;

const BACKGROUND: Record<ToastKind, string> = {
  success: theme.colors.ink,
  info: theme.colors.ink,
  error: theme.colors.danger,
};

/**
 * C7 toast: confirms an action for 4 s, with an optional action such as "Undo". Rendered at the bottom, above
 * the tab bar, on the dark ink surface (errors on --danger). Banners, not toasts, carry persistent state.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, kind: ToastKind = 'info', action?: ToastAction) => {
    counter.current += 1;
    setToast({ id: counter.current, kind, message, action });
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
  const icon = toast?.kind === 'success' ? 'checkmark-circle-outline' : toast?.kind === 'error' ? 'alert-circle-outline' : 'information-circle-outline';

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + theme.control.tabBarMinHeight + theme.spacing.s6 }]}>
          <FadeIn key={toast.id}>
            <View
              testID="toast"
              accessible={!toast.action}
              accessibilityRole={toast.kind === 'error' ? 'alert' : 'text'}
              accessibilityLiveRegion={toast.kind === 'error' ? 'assertive' : 'polite'}
              accessibilityLabel={toast.message}
              style={[styles.toast, { backgroundColor: BACKGROUND[toast.kind] }]}
            >
              <Icon name={icon} size="sm" color={toast.kind === 'error' ? theme.colors.inverse : theme.colors.primaryTint} />
              <AppText tone="inverse" style={styles.text}>
                {toast.message}
              </AppText>
              {toast.action ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={toast.action.label}
                  hitSlop={theme.spacing.s3}
                  onPress={() => {
                    toast.action?.onPress();
                    setToast(null);
                  }}
                >
                  <AppText variant="label" bold style={styles.action}>
                    {toast.action.label}
                  </AppText>
                </Pressable>
              ) : null}
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
  host: { position: 'absolute', left: theme.spacing.s4, right: theme.spacing.s4, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    width: '100%',
    maxWidth: theme.control.formMaxWidth,
    paddingHorizontal: theme.spacing.s4,
    paddingVertical: theme.spacing.s3,
    minHeight: theme.control.buttonLarge,
    borderRadius: theme.radius.lg,
    ...shadow(2),
  },
  text: { flex: 1 },
  action: { color: theme.colors.primaryTint },
});