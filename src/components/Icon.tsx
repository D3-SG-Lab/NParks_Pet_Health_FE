import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { theme } from '@/theme';

/**
 * Ionicons outline set, plus the glyphs the design uses that Ionicons lacks (the medication pill),
 * drawn from Material Community Icons.
 */
const EXTRA = { pill: 'pill' } as const;

export type IconName = ComponentProps<typeof Ionicons>['name'] | keyof typeof EXTRA;
export type IconSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeFor: Record<IconSize, number> = {
  xs: theme.control.iconXs,
  sm: theme.control.iconSm,
  md: theme.control.iconMd,
  lg: theme.control.iconLg,
};

interface IconProps {
  name: IconName;
  size?: IconSize;
  color?: ColorValue;
}

/** Decorative icon (hidden from screen readers; the parent control carries the label). */
export function Icon({ name, size = 'md', color = theme.colors.text }: IconProps) {
  const hidden = { accessible: false, importantForAccessibility: 'no', accessibilityElementsHidden: true } as const;
  if (name in EXTRA) {
    return <MaterialCommunityIcons name={EXTRA[name as keyof typeof EXTRA]} size={sizeFor[size]} color={color} {...hidden} />;
  }
  return <Ionicons name={name as ComponentProps<typeof Ionicons>['name']} size={sizeFor[size]} color={color} {...hidden} />;
}
