import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { theme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** Scroll the content (default true) so large text sizes never clip. */
  scroll?: boolean;
  /** Safe-area edges to pad. Tab screens pass top only because the tab bar handles the bottom. */
  edges?: readonly Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}

/** Page layout with safe areas and a centred, width-limited content column (keeps web readable). */
export function Screen({ children, scroll = true, edges = ['top', 'bottom', 'left', 'right'], contentStyle }: ScreenProps) {
  const inner = <View style={[styles.column, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.fill}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, alignItems: 'center' },
  fill: { flex: 1, alignItems: 'center' },
  column: {
    flexGrow: 1,
    width: '100%',
    maxWidth: theme.control.contentMaxWidth,
    padding: theme.spacing.xl,
  },
});
