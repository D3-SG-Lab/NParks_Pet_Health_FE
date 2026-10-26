import { StyleSheet, View } from 'react-native';

import { theme, webFocusReset } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Switch } from './Switch';

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * Labelled switch row. The whole row is the single accessible switch (checked state announced, Space / Enter
 * toggles on web). Keyboard focus shows the halo on the switch track; taps and clicks show no focus ring.
 */
export function ToggleRow({ label, description, value, onValueChange, disabled = false, testID }: ToggleRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[styles.row, webFocusReset]}
    >
      {({ focused }) => (
        <>
          <View style={styles.text}>
            <AppText variant="titleS" tone={disabled ? 'subtle' : 'default'}>
              {label}
            </AppText>
            {description ? (
              <AppText variant="bodyS" tone={disabled ? 'subtle' : 'muted'}>
                {description}
              </AppText>
            ) : null}
          </View>
          <Switch value={value} disabled={disabled} focused={focused} />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s4,
    minHeight: theme.control.minTouch,
    paddingVertical: theme.spacing.s1,
  },
  text: { flex: 1, gap: 2 },
});
