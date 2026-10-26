import { Tabs } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components';
import { useMedicationAnimals } from '@/features/medication/hooks';
import { theme } from '@/theme';

interface TabSpec {
  name: string;
  title: string;
  /** Used on narrow phones, where the full title would be truncated. */
  shortTitle?: string;
  icon: IconName;
}

const TABS: readonly TabSpec[] = [
  { name: 'index', title: 'Operations', icon: 'home-outline' },
  { name: 'daily-inspection', title: 'Daily Inspection', shortTitle: 'Inspection', icon: 'clipboard-outline' },
  { name: 'medication', title: 'Medication', icon: 'pill' },
  { name: 'cases', title: 'Cases', icon: 'folder-outline' },
];

/** Below this width the long tab titles are shortened. */
const NARROW_WIDTH = 400;

/** C5 bottom navigation (FE-004): four tabs, the active one on a --primary-soft pill; Medication shows overdue doses. */
export default function AppTabsLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const roomy = width >= theme.breakpoints.tablet;
  const narrow = width < NARROW_WIDTH;
  const medication = useMedicationAnimals();
  const overdue = medication.data?.reduce((sum, item) => sum + item.overdueCount, 0) ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primaryStrong,
        tabBarInactiveTintColor: theme.colors.text2,
        tabBarLabelStyle: { ...theme.text.caption, marginTop: 2 },
        // Icon beside the label on tablet/desktop, stacked on phones.
        tabBarLabelPosition: roomy ? 'beside-icon' : 'below-icon',
        // Explicit height: the default bar is shorter than pill + label, which clipped the labels.
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
          height: theme.control.tabBarMinHeight + theme.spacing.s2 + insets.bottom,
          paddingTop: theme.spacing.s2,
          paddingBottom: insets.bottom + theme.spacing.s2,
        },
        tabBarItemStyle: { minHeight: theme.control.minTouch },
        tabBarBadgeStyle: styles.badge,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: narrow && tab.shortTitle ? tab.shortTitle : tab.title,
            tabBarAccessibilityLabel: tab.name === 'medication' && overdue ? `${tab.title}, ${overdue} overdue` : tab.title,
            tabBarButtonTestID: `tab-${tab.name}`,
            tabBarBadge: tab.name === 'medication' && overdue ? overdue : undefined,
            tabBarIcon: ({ focused, color }) => (
              <View style={[styles.pill, focused && styles.pillActive]}>
                <Icon name={tab.icon} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { width: 56, height: 30, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: theme.colors.primarySoft },
  badge: {
    ...theme.text.caption,
    backgroundColor: theme.colors.danger,
    color: theme.colors.onPrimary,
    minWidth: 18,
    height: 18,
    lineHeight: 18,
    borderRadius: theme.radius.pill,
  },
});
