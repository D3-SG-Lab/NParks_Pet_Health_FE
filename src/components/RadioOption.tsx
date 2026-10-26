import { StyleSheet, View } from 'react-native';

import { focusRing, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon } from './Icon';

interface RadioOptionProps {
  label: string;
  /** Rationale line, e.g. "Suggested · matches C-0142". */
  description?: string;
  /** Iris badge on the right, e.g. "AI pick" on the AI-suggested option. */
  badge?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Compact grid cell (review-queue case actions): centred label, navy with a check when selected. */
  compact?: boolean;
  testID?: string;
}

/** C3 radio card (routing actions, close reasons). Use inside a radiogroup View. */
export function RadioOption({ label, description, badge, selected, onPress, disabled = false, compact = false, testID }: RadioOptionProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={[label, description, badge].filter(Boolean).join('. ')}
      accessibilityState={{ checked: selected, selected, disabled }}
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.option,
        compact && styles.compact,
        selected && (compact ? styles.selectedCompact : styles.selected),
        disabled && styles.disabled,
        pressed && !selected && styles.pressed,
        focused && focusRing,
      ]}
    >
      {compact ? (
        selected ? (
          <Icon name="checkmark" size="sm" color={theme.colors.onSecondary} />
        ) : null
      ) : (
        <View style={[styles.circle, selected && styles.circleSelected]}>{selected ? <View style={styles.dot} /> : null}</View>
      )}
      <View style={[styles.text, compact && styles.textCompact]}>
        <AppText
          variant={compact ? 'label' : 'body'}
          bold={selected}
          center={compact}
          style={compact && selected ? styles.compactSelectedText : disabled ? styles.disabledText : undefined}
        >
          {label}
        </AppText>
        {description ? (
          <AppText variant="bodyS" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <AppText variant="caption" tone="ai" bold>
            {badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const RADIO = 22;

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    minHeight: theme.control.buttonLarge,
    paddingHorizontal: theme.spacing.s4,
    paddingVertical: theme.spacing.s3,
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
  },
  compact: {
    flexGrow: 1,
    flexBasis: '45%',
    justifyContent: 'center',
    gap: theme.spacing.s2,
    paddingHorizontal: theme.spacing.s2,
    borderColor: theme.colors.lineStrong,
  },
  selected: { borderColor: theme.colors.primary, borderWidth: 1.5, backgroundColor: theme.colors.primarySoft },
  selectedCompact: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  compactSelectedText: { color: theme.colors.onSecondary },
  disabled: { backgroundColor: theme.colors.disabledSurface, borderColor: theme.colors.disabledSurface },
  disabledText: { color: theme.colors.disabled },
  pressed: { backgroundColor: theme.colors.surface2 },
  circle: {
    width: RADIO,
    height: RADIO,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  circleSelected: { borderColor: theme.colors.primary, borderWidth: theme.control.focusWidth },
  dot: { width: RADIO / 2, height: RADIO / 2, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary },
  text: { flex: 1, gap: 2 },
  textCompact: { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' },
  badge: {
    paddingHorizontal: theme.spacing.s2,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.aiSoft,
  },
});
