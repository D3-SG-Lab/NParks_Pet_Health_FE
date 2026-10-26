import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

interface AvatarProps {
  /** Name used for the initials. Decorative: the parent row carries the accessible label. */
  name: string;
  /** sm 36 (dense rows, people chips), md 44 (list rows), lg 88 (profile header). */
  size?: 'sm' | 'md' | 'lg';
  /**
   * animal: primary-soft tile (dogs and other species), warm for cats, muted for closed records.
   * person: navy circle with white initials (staff).
   */
  kind?: 'animal' | 'person';
  tone?: 'default' | 'warm' | 'muted';
  /** Camera badge on the profile photo. */
  showCamera?: boolean;
}

const TONES = {
  default: { bg: theme.colors.primarySoft, text: theme.colors.primaryStrong },
  warm: { bg: theme.colors.abnormalSoft, text: theme.colors.warning },
  muted: { bg: theme.colors.surface2, text: theme.colors.text2 },
} as const;

/** Placeholder photo: initials on a tinted tile. Replace with the animal photo when media exists. */
export function Avatar({ name, size = 'md', kind = 'animal', tone = 'default', showCamera = false }: AvatarProps) {
  const initials = name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part, _, parts) => (parts.length === 1 ? part.slice(0, 2) : part.charAt(0)))
    .join('')
    .toUpperCase();
  const dimension = size === 'lg' ? theme.control.avatarLarge : size === 'sm' ? 36 : theme.control.avatar;
  const colors = kind === 'person' ? { bg: theme.colors.secondary, text: theme.colors.onSecondary } : TONES[tone];
  return (
    <View
      style={[
        styles.tile,
        {
          width: dimension,
          height: dimension,
          backgroundColor: colors.bg,
          borderRadius: size === 'lg' ? theme.radius.xl : theme.radius.pill,
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText variant={size === 'lg' ? 'titleL' : size === 'sm' ? 'caption' : 'label'} bold style={{ color: colors.text }}>
        {initials}
      </AppText>
      {showCamera ? (
        <View style={styles.camera}>
          <Icon name="camera-outline" size="xs" color={theme.colors.text2} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
  camera: {
    position: 'absolute',
    right: -theme.spacing.s1,
    bottom: -theme.spacing.s1,
    width: 26,
    height: 26,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
  },
});
