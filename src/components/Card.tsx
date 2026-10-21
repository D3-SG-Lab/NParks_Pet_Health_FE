import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({ children, style, testID }: CardProps) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.divider,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOpacity: theme.elevation.card.shadowOpacity,
    shadowRadius: theme.elevation.card.shadowRadius,
    shadowOffset: { width: 0, height: theme.elevation.card.shadowOffsetY },
    elevation: theme.elevation.card.elevation,
  },
});
