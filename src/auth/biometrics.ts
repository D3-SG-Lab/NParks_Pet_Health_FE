import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/** Biometrics are native only. expo-local-authentication has no web support. */
export async function isBiometricSupported(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage });
    return result.success;
  } catch {
    return false;
  }
}
