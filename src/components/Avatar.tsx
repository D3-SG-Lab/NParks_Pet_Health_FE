import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

interface AvatarProps {
  /** Name used for the initials. Decorative: the parent row carries the accessible label. */
  name: string;
}

/** Placeholder animal photo: initials on a tinted circle. Replace with the photo when media exists. */
export function Avatar({ name }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return (
    <View style={styles.circle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <AppText bold style={styles.text}>
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: theme.control.avatar,
    height: theme.control.avatar,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: theme.colors.primary },
});
