import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createQueryClient } from '@/api/queryClient';
import { AuthProvider, useSession } from '@/auth';
import { LoadingView } from '@/components';

function RootNavigator() {
  const { status } = useSession();

  if (status === 'loading') {
    return <LoadingView label="Loading" />;
  }

  // Route guards: signed-out users can only reach sign-in; signed-in users only reach the tabs.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'locked'}>
        <Stack.Screen name="unlock" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      {/* OIDC redirect target; always reachable so the auth session can complete. */}
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
