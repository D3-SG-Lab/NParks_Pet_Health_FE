import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';

import { theme } from '@/theme';

import { Card } from './Card';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

/** One pulsing placeholder block (FE-025 loading state). */
export function Skeleton({ width = '100%', height = 12, radius = theme.radius.pill }: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    // No endless animation under Jest: it would keep the test runner busy.
    if (process.env.NODE_ENV === 'test') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: theme.motion.slow / 2, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: theme.motion.slow / 2, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.block, { width, height, borderRadius: radius, opacity }]} />;
}

interface SkeletonListProps {
  rows?: number;
  /** Spoken label for the busy region. */
  label: string;
  testID?: string;
}

/** Card of placeholder rows shown while a list loads (wireframe "Loading" state). */
export function SkeletonList({ rows = 3, label, testID }: SkeletonListProps) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} testID={testID}>
      <Card padded={false}>
        {Array.from({ length: rows }, (_, index) => (
          <View key={index} style={[styles.row, index > 0 && styles.divider]}>
            <Skeleton width={theme.control.avatar} height={theme.control.avatar} />
            <View style={styles.lines}>
              <Skeleton width="55%" height={14} />
              <Skeleton width="85%" height={12} />
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: theme.colors.surface2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3, padding: theme.spacing.s4 },
  divider: { borderTopWidth: theme.control.borderWidth, borderTopColor: theme.colors.line },
  lines: { flex: 1, gap: theme.spacing.s2 },
});