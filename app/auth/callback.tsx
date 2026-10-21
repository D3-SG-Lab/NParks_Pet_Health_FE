import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

// Web: this page loads inside the auth popup/redirect and hands the result back to the opener.
WebBrowser.maybeCompleteAuthSession();

/**
 * OIDC redirect target. On native, the deep link lands here while the auth session finishes, then we
 * go back to the root (the route guard picks sign-in or the tabs). On web the popup closes itself.
 */
export default function AuthCallback() {
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.colors.primary} accessibilityLabel="Completing sign-in" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
});
