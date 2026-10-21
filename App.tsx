import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { login } from './src/auth/authService';
import LoginScreen from './src/screens/LoginScreen';

export default function App(): React.JSX.Element {
  // Post-login navigation (WebView, cookie sync, FCM) is out of scope for this feature.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      <LoginScreen onSubmit={login} />
    </SafeAreaView>
  );
}
