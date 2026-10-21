import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components';
import { theme } from '@/theme';

interface TabSpec {
  name: string;
  title: string;
  icon: IconName;
  iconActive: IconName;
}

const TABS: readonly TabSpec[] = [
  { name: 'index', title: 'Operations', icon: 'grid-outline', iconActive: 'grid' },
  { name: 'daily-inspection', title: 'Daily Inspection', icon: 'clipboard-outline', iconActive: 'clipboard' },
  { name: 'medication', title: 'Medication', icon: 'medkit-outline', iconActive: 'medkit' },
  { name: 'cases', title: 'Cases', icon: 'folder-open-outline', iconActive: 'folder-open' },
];

/** Bottom tabs (FE-004). Role-based visibility is added later via useSession().role. */
export default function AppTabsLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const roomy = width >= theme.breakpoints.tablet;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { fontSize: theme.fontSizes.caption, fontWeight: theme.fontWeights.medium },
        // Icon beside the label on tablet/desktop, stacked on phones.
        tabBarLabelPosition: roomy ? 'beside-icon' : 'below-icon',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          minHeight: theme.control.tabBarMinHeight + insets.bottom,
          paddingTop: theme.spacing.xs,
        },
        tabBarItemStyle: { minHeight: theme.control.minTouch, paddingVertical: theme.spacing.xs },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarButtonTestID: `tab-${tab.name}`,
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? tab.iconActive : tab.icon} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
