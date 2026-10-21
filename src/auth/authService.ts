import type { LoginCredentials } from './validation';

const API_URL: string | undefined = process.env.EXPO_PUBLIC_API_URL;

/**
 * Placeholder sign-in call. The endpoint path is an assumption and must be
 * confirmed against the backend contract. The base URL comes from env config.
 */
export async function login(credentials: LoginCredentials): Promise<void> {
  if (!API_URL) {
    throw new Error('Backend URL is not configured (EXPO_PUBLIC_API_URL).');
  }
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    throw new Error('Invalid username or password.');
  }
}
