import { StyleSheet, View } from 'react-native';

import { focusRing, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon, type IconName } from './Icon';

export type ChipVariant = 'filter' | 'ai' | 'citation';

interface ChipProps {
  label: string;
  /** Count badge after the label ("Open 5"). */
  count?: number;
  /**
   * filter: C3 filter chip — outlined pill, navy (--secondary) when selected, optional count badge.
   * ai: iris AI candidate ("KC2-4 Coco · 48%"), mono text.
   * citation: small numbered source marker in an AI summary ("1", "Obs 20/10"), mono text.
   */
  variant?: ChipVariant;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export function Chip({ label, count, variant = 'filter', selected = false, onPress, icon, accessibilityLabel, accessibilityHint, testID }: ChipProps) {
  const on = variant === 'filter' && selected;
  const textColor = on ? theme.colors.onSecondary : variant === 'filter' ? theme.colors.text : theme.colors.ai;

  const content = (
    <>
      {icon ? <Icon name={icon} size="xs" color={textColor} /> : null}
      <AppText
        variant={variant === 'filter' ? 'label' : variant === 'ai' ? 'mono' : 'caption'}
        bold={variant !== 'filter'}
        style={[{ color: textColor }, variant === 'citation' && styles.citationText]}
      >
        {label}
      </AppText>
      {count !== undefined ? (
        <View style={[styles.count, on && styles.countOn]}>
          <AppText variant="caption" style={{ color: textColor }}>
            {String(count)}
          </AppText>
        </View>
      ) : null}
    </>
  );

  const style = [styles.chip, styles[variant], on && styles.selected];
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
      accessibilityRole={variant === 'filter' ? 'checkbox' : 'link'}
      accessibilityLabel={accessibilityLabel ?? (count === undefined ? label : `${label}, ${count}`)}
      accessibilityHint={accessibilityHint}
      accessibilityState={variant === 'filter' ? { checked: selected, selected } : undefined}
      aria-checked={variant === 'filter' ? selected : undefined}
      onPress={onPress}
      hitSlop={variant === 'citation' ? theme.spacing.s2 : { top: theme.spacing.s1, bottom: theme.spacing.s1 }}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        ...style,
        pressed && (on ? styles.pressedOn : styles.pressed),
        focused && focusRing,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.s2,
    borderRadius: theme.radius.pill,
    borderWidth: theme.control.borderWidth,
  },
  filter: {
    minHeight: theme.control.minTouch - theme.spacing.s1,
    paddingHorizontal: theme.spacing.s4,
    borderColor: theme.colors.lineStrong,
    backgroundColor: theme.colors.surface,
  },
  ai: {
    minHeight: theme.control.minTouch - theme.spacing.s2,
    paddingHorizontal: theme.spacing.s3,
    borderColor: theme.colors.aiBorder,
    backgroundColor: theme.colors.aiSoft,
  },
  citation: {
    gap: theme.spacing.s1,
    minWidth: 22,
    minHeight: 22,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.s1 + 2,
    borderRadius: theme.radius.sm,
    borderColor: theme.colors.aiBorder,
    backgroundColor: theme.colors.surface,
  },
  citationText: { fontFamily: theme.fonts.mono },
  selected: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: theme.spacing.s1 + 2,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface2,
  },
  countOn: { backgroundColor: theme.colors.inkLine },
  pressed: { backgroundColor: theme.colors.surface2 },
  pressedOn: { opacity: 0.88 },
});
