import { useEffect, useState, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/theme';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Subtle fade + rise on mount. Uses the native driver on iOS/Android. */
export function FadeIn({ children, delay = 0, style }: FadeInProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: theme.motion.base,
      delay,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [theme.spacing.md, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
