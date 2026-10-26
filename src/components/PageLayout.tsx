import type { ReactNode, RefObject } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { theme } from '@/theme';

interface PageLayoutProps {
  header: ReactNode;
  children: ReactNode;
  /** Sticky action bar pinned to the bottom (wireframe footers). */
  footer?: ReactNode;
  /** Banner pinned between the header and the content (e.g. offline). */
  banner?: ReactNode;
  /** Full-width white band at the top of the scrolling content (profile identity, case title). */
  hero?: ReactNode;
  /** 'form' uses the narrow form column, 'wide' the wide content column. */
  width?: 'form' | 'wide';
  /** Safe-area edges to pad. Tab screens omit 'bottom' because the tab bar handles it. */
  edges?: readonly Edge[];
  scrollRef?: RefObject<ScrollView | null>;
  /** Pull to refresh (FE-005). */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Surface background for form screens; canvas grey for dashboards and lists. */
  background?: 'canvas' | 'surface';
}

/**
 * Header + scrolling content + optional sticky footer. Content stays in a centred, width-limited
 * column so the same layout reads well on small phones, large phones, tablets and web. Nothing has a
 * fixed height, so large font sizes simply scroll.
 */
export function PageLayout({
  header,
  children,
  footer,
  banner,
  hero,
  width = 'form',
  edges = ['top', 'bottom', 'left', 'right'],
  scrollRef,
  refreshing,
  onRefresh,
  background = 'canvas',
}: PageLayoutProps) {
  const maxWidth = width === 'wide' ? theme.control.contentMaxWidthWide : theme.control.formMaxWidth;
  const bg = background === 'surface' ? theme.colors.surface : theme.colors.background;
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView style={[styles.fill, { backgroundColor: bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        {banner}
        <ScrollView
          ref={scrollRef}
          style={styles.fill}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} /> : undefined
          }
        >
          {hero ? (
            <View style={styles.hero}>
              <View style={[styles.heroInner, { maxWidth }]}>{hero}</View>
            </View>
          ) : null}
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
  fill: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center' },
  hero: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: theme.control.borderWidth,
    borderBottomColor: theme.colors.line,
  },
  heroInner: { width: '100%', padding: theme.spacing.s4, gap: theme.spacing.s4 },
  column: { width: '100%', paddingHorizontal: theme.spacing.s4, paddingTop: theme.spacing.s4, paddingBottom: theme.spacing.s8, gap: theme.spacing.s4 },
  footer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: theme.control.borderWidth,
    borderTopColor: theme.colors.line,
    alignItems: 'center',
  },
  footerInner: { width: '100%', paddingHorizontal: theme.spacing.s4, paddingTop: theme.spacing.s3, paddingBottom: theme.spacing.s3, gap: theme.spacing.s2 },
});