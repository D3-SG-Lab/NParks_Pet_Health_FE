import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { ToastProvider } from '@/components';
import { NotificationsProvider } from '@/features/notifications/NotificationsProvider';
import { resetMockDb } from '@/mock/db';
import { theme } from '@/theme';

/**
 * Signed-in area: the bottom tabs at the root, with flow and detail screens pushed on top (without
 * the tab bar). Back always returns to the screen the user came from, e.g. Case → Animal → back.
 */
export default function AppLayout() {
  // The demo data lives in memory for one signed-in session. This layout unmounts on sign-out
  // (route guard), so the next user always starts from the seed data with no leftover draft.
  useEffect(() => resetMockDb, []);

  return (
    <ToastProvider>
      <NotificationsProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="new-arrival" />
          <Stack.Screen name="arrival-exam" />
          <Stack.Screen name="new-observation" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="observation/[id]" />
          <Stack.Screen name="review-queue" />
          <Stack.Screen name="animal/[id]" />
          <Stack.Screen name="case/[id]" />
          <Stack.Screen name="inspect/[animalId]" />
          <Stack.Screen name="medicate/[animalId]" />
          <Stack.Screen name="sync" />
        </Stack>
      </NotificationsProvider>
    </ToastProvider>
  );
}