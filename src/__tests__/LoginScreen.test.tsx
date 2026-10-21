import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LoginScreen from '../screens/LoginScreen';

describe('LoginScreen', () => {
  it('shows validation errors and does not submit empty form', () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<LoginScreen onSubmit={onSubmit} />);
    fireEvent.press(screen.getByTestId('login-button'));
    expect(screen.getByText('Username is required')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed credentials and surfaces failures', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Invalid username or password.'));
    render(<LoginScreen onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByTestId('username-input'), ' officer ');
    fireEvent.changeText(screen.getByTestId('password-input'), 'secret');
    fireEvent.press(screen.getByTestId('login-button'));
    await waitFor(() =>
      expect(screen.getByText('Invalid username or password.')).toBeTruthy(),
    );
    expect(onSubmit).toHaveBeenCalledWith({ username: 'officer', password: 'secret' });
  });
});
