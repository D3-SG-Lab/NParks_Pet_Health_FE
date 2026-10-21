import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { theme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type IconSize = 'sm' | 'md' | 'lg';

const sizeFor: Record<IconSize, number> = {
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
  return (
    <Ionicons
      name={name}
      size={sizeFor[size]}
      color={color}
      accessible={false}
      importantForAccessibility="no"
      accessibilityElementsHidden
    />
  );
}
