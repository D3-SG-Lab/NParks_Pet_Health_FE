import { validateLogin } from '../auth/validation';

describe('validateLogin', () => {
  it('requires both fields', () => {
    expect(validateLogin({ username: ' ', password: '' })).toEqual({
      username: 'Username is required',
      password: 'Password is required',
    });
  });

  it('passes with valid input', () => {
    expect(validateLogin({ username: 'officer', password: 'x' })).toEqual({});
  });
});
