import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

/**
 * Modal bottom sheet. Tapping the dimmed backdrop, the close button, or the system back
 * gesture (Android) / Escape (web) closes it. Content is centred and width-limited on large screens.
 */
export function BottomSheet({ visible, title, onClose, children, testID }: BottomSheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root} testID={testID}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          // Dismiss target for pointer users only; screen readers use the labelled close button.
          accessible={false}
          importantForAccessibility="no"
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { maxHeight: height * theme.control.sheetMaxHeightRatio, paddingBottom: insets.bottom + theme.spacing.lg },
          ]}
        >
          <View style={styles.header}>
            <AppText variant="bodyLarge" bold accessibilityRole="header" style={styles.title}>
              {title}
            </AppText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={`Close ${title}`}
              hitSlop={theme.spacing.sm}
              style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.close, focused && styles.focused]}
            >
              <Icon name="close" />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
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
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  title: { flex: 1 },
  close: {
    minWidth: theme.control.minTouch,
    minHeight: theme.control.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  focused: { borderWidth: theme.control.focusWidth, borderColor: theme.colors.focus },
});
