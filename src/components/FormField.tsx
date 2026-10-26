import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

interface FormFieldProps {
  label: string;
  /** Appends a red "*". */
  required?: boolean;
  /** Appends a muted "(optional)" to the label. */
  optional?: boolean;
  /** Disabled field: label in --text-3. */
  disabled?: boolean;
  /** Right-aligned note on the label row, e.g. "Abnormal · sent for AI routing". */
  aside?: ReactNode;
  error?: string;
  helper?: string;
  children: ReactNode;
}

/**
 * C2 field: label above, helper below. An error replaces the helper and adds an icon, so colour is never
 * the only signal. Errors are announced politely to screen readers.
 */
export function FormField({ label, required = false, optional = false, disabled = false, aside, error, helper, children }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <AppText variant="label" tone={disabled ? 'subtle' : 'default'} style={styles.label}>
          {label}
          {required ? <AppText variant="label" tone="danger">{' *'}</AppText> : null}
          {optional ? <AppText variant="bodyS" tone="subtle">{' (optional)'}</AppText> : null}
        </AppText>
        {typeof aside === 'string' ? (
          <AppText variant="bodyS" tone="subtle">
            {aside}
          </AppText>
        ) : (
          aside
        )}
      </View>
      {children}
      {error ? (
        <View style={styles.message} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <View style={styles.icon}>
            <Icon name="alert-circle-outline" size="xs" color={theme.colors.danger} />
          </View>
          <AppText variant="bodyS" tone="danger" style={styles.messageText}>
            {error}
          </AppText>
        </View>
      ) : helper ? (
        <AppText variant="bodyS" tone="subtle">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing.s2 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.spacing.s2, flexWrap: 'wrap' },
  label: { flexShrink: 1 },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.s1 + 2 },
  icon: { marginTop: 3 },
  messageText: { flex: 1 },
});
