import { StyleSheet, View } from 'react-native';

import { focusRing, shadow, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { ProgressBar } from './ProgressBar';

interface StatCardProps {
  value: number;
  label: string;
  /** C6 stat tile: default, or attention (warning edge and value) when the number needs action. */
  tone?: 'default' | 'attention';
  /** 0..1 — progress under the label (e.g. checks done this session). */
  progress?: number;
  /** Makes the tile a button (e.g. Active pets opens the animal list). */
  onPress?: () => void;
  accessibilityHint?: string;
  testID?: string;
}

/** Metric tile ("42 / Active pets"). Read as one item: "Active pets, 42". Shrinks to fit 3 per row. */
export function StatCard({ value, label, tone = 'default', progress, onPress, accessibilityHint, testID }: StatCardProps) {
  const attention = tone === 'attention';
  const content = (
    <>
      <AppText
        variant="display"
        tone={attention ? 'warning' : 'default'}
        accessibilityLabel={`${label}, ${value}`}
        accessible={!onPress}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {String(value)}
      </AppText>
      <AppText variant="bodyS" tone="muted" importantForAccessibility="no" accessibilityElementsHidden numberOfLines={2}>
        {label}
      </AppText>
      {progress !== undefined ? (
        <View style={styles.progress} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <ProgressBar value={progress} label={`${label} progress`} />
        </View>
      ) : null}
    </>
  );
  const style = [styles.card, attention && styles.attention];
  if (!onPress) {
    return (
      <View testID={testID} style={style}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [...style, pressed && styles.pressed, focused && focusRing]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    padding: theme.spacing.s4,
    borderRadius: theme.radius.xl,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
    ...shadow(1),
  },
  attention: { borderColor: theme.colors.warningBorder },
  progress: { paddingTop: theme.spacing.s2 },
  pressed: { backgroundColor: theme.colors.primarySoft },
});
