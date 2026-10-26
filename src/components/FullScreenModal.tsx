import type { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/theme';

import { ScreenHeader } from './ScreenHeader';

interface FullScreenModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Trailing header content. */
  trailing?: ReactNode;
  /** Dark backdrop (evidence viewer) instead of the page background. */
  dark?: boolean;
  testID?: string;
}

/**
 * Full-screen modal page with a close (X) header, e.g. the animal picker (wireframe "Select
 * animal"). The screen underneath keeps its state, so forms are not lost while picking.
 * Android back and web Escape close it.
 */
export function FullScreenModal({ visible, title, onClose, children, trailing, dark = false, testID }: FullScreenModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      {/* Modals render outside the app root on native, so they need their own safe-area context. */}
      <SafeAreaProvider>
        <SafeAreaView style={[styles.safe, dark && styles.dark]} edges={['top', 'bottom', 'left', 'right']} testID={testID}>
          <ScreenHeader title={title} onBack={onClose} backIcon="close" backLabel={`Close ${title}`} trailing={trailing} />
          <View style={styles.body}>{children}</View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  dark: { backgroundColor: theme.colors.text },
  body: { flex: 1, backgroundColor: theme.colors.surface },
});