export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginErrors {
  username?: string;
  password?: string;
}

/** Assumed rules (wireframe not readable in this run): both fields required. */
export function validateLogin({ username, password }: LoginCredentials): LoginErrors {
  const errors: LoginErrors = {};
  if (username.trim().length === 0) {
    errors.username = 'Username is required';
  }
  if (password.length === 0) {
    errors.password = 'Password is required';
  }
  return errors;
}
