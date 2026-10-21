import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, ToastProvider, type IconName } from '@/components';
import { resetMockDb } from '@/mock/db';
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

/** Full-screen flow routes: reachable by navigation, never shown as a tab, and without the tab bar. */
const FLOW_ROUTES: readonly string[] = ['new-arrival', 'arrival-exam'];

/** Bottom tabs (FE-004). Role-based visibility is added later via useSession().role. */
export default function AppTabsLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const roomy = width >= theme.breakpoints.tablet;

  // The demo data lives in memory for one signed-in session. This layout unmounts on sign-out
  // (route guard), so the next user always starts from the seed data with no leftover draft.
  useEffect(() => resetMockDb, []);

  return (
    <ToastProvider>
      <Tabs
        // Back from a flow screen returns to where the user came from (e.g. Operations).
        backBehavior="history"
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
        {FLOW_ROUTES.map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null, tabBarStyle: { display: 'none' } }} />
        ))}
      </Tabs>
    </ToastProvider>
  );
}
