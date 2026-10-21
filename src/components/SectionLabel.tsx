import { StyleSheet } from 'react-native';

import { AppText } from './AppText';

interface SectionLabelProps {
  children: string;
}

/** Small uppercase section heading (QUICK ACTIONS, PHYSICAL EXAM, ...). */
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <AppText variant="caption" tone="muted" bold accessibilityRole="header" style={styles.label}>
      {children.toUpperCase()}
    </AppText>
  );
}

const styles = StyleSheet.create({
  label: { letterSpacing: 0.8 },
});
