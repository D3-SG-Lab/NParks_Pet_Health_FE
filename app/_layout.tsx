import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createQueryClient } from '@/api/queryClient';
import { AuthProvider, useSession } from '@/auth';
import { LoadingView } from '@/components';
import { isAuthBypassEnabled } from '@/config/env';

function RootNavigator() {
  const { status } = useSession();

  if (status === 'loading') {
    return <LoadingView label="Loading" />;
  }

  // Route guards: signed-out users can only reach sign-in; signed-in users only reach the tabs.
  // The development auth bypass keeps sign-in and unlock reachable too, so every screen can be previewed.
  const bypass = isAuthBypassEnabled();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedOut' || bypass}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'locked' || bypass}>
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

/** IBM Plex Sans + Plex Mono (design system typography). Keys are the font families used by `theme.fonts`. */
const FONTS = {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
};

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  // Render once the fonts are ready (or failed to load, in which case the system font is used).
  const [fontsLoaded, fontError] = useFonts(FONTS);
  if (!fontsLoaded && !fontError) return null;
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
