import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState, ErrorView, LoadingView, ToggleRow } from '@/components';

describe('shell components', () => {
  it('FE-025: empty state shows title and message', () => {
    render(<EmptyState icon="paw-outline" title="No open cases" message="All animals in your kennels are well today." />);
    expect(screen.getByText('No open cases')).toBeTruthy();
    expect(screen.getByText('All animals in your kennels are well today.')).toBeTruthy();
  });
  it('FE-001: loading view is announced as busy', () => {
    render(<LoadingView label="Loading" />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });
  it('FE-001: error view shows message', () => {
    render(<ErrorView message="Boom" />);
    expect(screen.getByText('Boom')).toBeTruthy();
  });
  it('FE-018: work-offline switch row exposes and toggles its state', () => {
    const onValueChange = jest.fn();
    const { rerender } = render(<ToggleRow label="Work offline (demo)" value={false} onValueChange={onValueChange} testID="toggle" />);
    const toggle = screen.getByRole('switch', { name: 'Work offline (demo)' });
    expect(toggle.props.accessibilityState).toMatchObject({ checked: false });
    fireEvent.press(toggle);
    expect(onValueChange).toHaveBeenLastCalledWith(true);
    rerender(<ToggleRow label="Work offline (demo)" value onValueChange={onValueChange} testID="toggle" />);
    expect(screen.getByRole('switch').props.accessibilityState).toMatchObject({ checked: true });
    fireEvent.press(screen.getByRole('switch'));
    expect(onValueChange).toHaveBeenLastCalledWith(false);
  });
});
