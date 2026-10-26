import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { focusRing, shadow, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon, type IconName } from './Icon';

interface BottomSheetProps {
  visible: boolean;
  title: string;
  /** Icon tile before the title (e.g. the pill icon on "Record administration"). */
  icon?: IconName;
  onClose: () => void;
  children: ReactNode;
  /** Pinned actions under the content (e.g. Cancel / Confirm administered). */
  footer?: ReactNode;
  /** Scroll the content when it can be taller than the sheet (don't use with a FlatList child). */
  scroll?: boolean;
  testID?: string;
}

/**
 * C8 bottom sheet (pickers and quick records on mobile): 24 top radius, grab handle, shadow-3. Tapping the
 * dimmed backdrop, the footer's Cancel, the close button (sheets without a footer), the system back gesture
 * (Android), the VoiceOver escape gesture or Escape (web) closes it. Width-limited on tablets/web.
 */
export function BottomSheet({ visible, title, icon, onClose, children, footer, scroll = false, testID }: BottomSheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} testID={testID}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          // Dismiss target for pointer users only; screen readers use the labelled close button.
          accessible={false}
          importantForAccessibility="no"
        />
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={[styles.sheet, { maxHeight: height * theme.control.sheetMaxHeightRatio, paddingBottom: insets.bottom + theme.spacing.s4 }]}
        >
          <View style={styles.grabber} />
          <View style={styles.header}>
            {icon ? (
              <View style={styles.iconTile}>
                <Icon name={icon} size="sm" color={theme.colors.primary} />
              </View>
            ) : null}
            <AppText variant="titleL" accessibilityRole="header" style={styles.title}>
              {title}
            </AppText>
            {footer ? null : (
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={`Close ${title}`}
                hitSlop={theme.spacing.s2}
                style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.close, focused && focusRing]}
              >
                <Icon name="close" size="sm" color={theme.colors.text2} />
              </Pressable>
            )}
          </View>
          {scroll ? (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.backdrop },
  sheet: {
    width: '100%',
    maxWidth: theme.control.formMaxWidth,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    paddingTop: theme.spacing.s3,
    paddingHorizontal: theme.spacing.s4,
    gap: theme.spacing.s4,
    ...shadow(3),
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.lineStrong,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 },
  iconTile: {
    width: theme.control.iconBadge,
    height: theme.control.iconBadge,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  title: { flex: 1 },
  close: {
    width: theme.control.minTouch - 8,
    height: theme.control.minTouch - 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface2,
  },
  scroll: { flexGrow: 0 },
  content: { gap: theme.spacing.s3, paddingBottom: theme.spacing.s1 },
  footer: { flexDirection: 'row', gap: theme.spacing.s3 },
});