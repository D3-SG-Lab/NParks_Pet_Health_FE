import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, FadeIn, Icon } from '@/components';
import { shadow, theme } from '@/theme';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Login / unlock layout (screen 1): --primary-deep hero with the app mark, content on a 24-radius white sheet. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FadeIn style={styles.hero}>
          {/* App mark placeholder: replace with the brand asset when DES delivers it. */}
          <View style={styles.logo} accessible accessibilityRole="image" accessibilityLabel="AQC Animal Health logo">
            <Icon name="shield-checkmark-outline" size="lg" color={theme.colors.primary} />
          </View>
          <AppText variant="display" tone="inverse" center accessibilityRole="header">
            {title}
          </AppText>
          <AppText center style={styles.subtitle}>
            {subtitle}
          </AppText>
        </FadeIn>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.column}>{children}</View>
        </SafeAreaView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.primaryDeep },
  scroll: { flexGrow: 1 },
  hero: { alignItems: 'center', gap: theme.spacing.s2, paddingHorizontal: theme.spacing.s6, paddingTop: theme.spacing.s12, paddingBottom: theme.spacing.s12 },
  logo: {
    width: theme.control.logo,
    height: theme.control.logo,
    borderRadius: theme.radius.sheet,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.s4,
    ...shadow(3),
  },
  subtitle: { color: theme.colors.primaryTint },
  sheet: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
  },
  column: {
    flexGrow: 1,
    width: '100%',
    maxWidth: theme.control.contentMaxWidth,
    gap: theme.spacing.s4,
    paddingHorizontal: theme.spacing.s4,
    paddingTop: theme.spacing.s6,
    paddingBottom: theme.spacing.s4,
  },
});
