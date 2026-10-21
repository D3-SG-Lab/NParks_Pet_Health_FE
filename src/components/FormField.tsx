import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

interface FormFieldProps {
  label: string;
  /** Appends a muted "(optional)" to the label. */
  optional?: boolean;
  error?: string;
  helper?: string;
  children: ReactNode;
}

/** Label + control + helper/error text. Errors are announced politely to screen readers. */
export function FormField({ label, optional = false, error, helper, children }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <AppText bold>
        {label}
        {optional ? (
          <AppText tone="muted">{' (optional)'}</AppText>
        ) : null}
      </AppText>
      {children}
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="muted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing.sm },
});
