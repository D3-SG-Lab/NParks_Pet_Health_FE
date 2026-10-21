import type { ReactNode, RefObject } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { theme } from '@/theme';

interface PageLayoutProps {
  header: ReactNode;
  children: ReactNode;
  /** Sticky action bar pinned to the bottom (wireframe footers). */
  footer?: ReactNode;
  /** 'form' uses the narrow form column, 'wide' the wide content column. */
  width?: 'form' | 'wide';
  /** Safe-area edges to pad. Tab screens omit 'bottom' because the tab bar handles it. */
  edges?: readonly Edge[];
  scrollRef?: RefObject<ScrollView | null>;
}

/**
 * Header + scrolling content + optional sticky footer. Content stays in a centred, width-limited
 * column so the same layout reads well on phones, tablets and desktop web. Text never has a fixed
 * height, so large font sizes simply scroll.
 */
export function PageLayout({
  header,
  children,
  footer,
  width = 'form',
  edges = ['top', 'bottom', 'left', 'right'],
  scrollRef,
}: PageLayoutProps) {
  const maxWidth = width === 'wide' ? theme.control.contentMaxWidthWide : theme.control.formMaxWidth;
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        <ScrollView
          ref={scrollRef}
          style={styles.fill}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.column, { maxWidth }]}>{children}</View>
        </ScrollView>
        {footer ? (
          <View style={styles.footer}>
            <View style={[styles.footerInner, { maxWidth }]}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  fill: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, alignItems: 'center' },
  column: { width: '100%', padding: theme.spacing.lg, gap: theme.spacing.lg },
  footer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: theme.control.borderWidth,
    borderTopColor: theme.colors.divider,
    alignItems: 'center',
  },
  footerInner: { width: '100%', padding: theme.spacing.lg, gap: theme.spacing.md },
});
