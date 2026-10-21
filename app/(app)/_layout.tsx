import { Tabs } from 'expo-router';

import { theme } from '@/theme';

/** Bottom tabs (FE-004). Role-based visibility is added later via useSession().role. */
export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { fontSize: theme.fontSizes.caption },
        tabBarStyle: { backgroundColor: theme.colors.surface },
        // Icons are not defined yet (no design tokens/assets); labels carry the meaning.
        tabBarIcon: () => null,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Operations', tabBarAccessibilityLabel: 'Operations' }} />
      <Tabs.Screen
        name="daily-inspection"
        options={{ title: 'Daily Inspection', tabBarAccessibilityLabel: 'Daily Inspection' }}
      />
      <Tabs.Screen name="medication" options={{ title: 'Medication', tabBarAccessibilityLabel: 'Medication' }} />
      <Tabs.Screen name="cases" options={{ title: 'Cases', tabBarAccessibilityLabel: 'Cases' }} />
    </Tabs>
  );
}
