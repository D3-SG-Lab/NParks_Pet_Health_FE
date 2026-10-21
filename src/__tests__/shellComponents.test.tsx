import { render, screen } from '@testing-library/react-native';

import { ErrorView, LoadingView } from '@/components';
import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

describe('shell components', () => {
  it('FE-004: placeholder screen shows title and coming-soon state', () => {
    render(<PlaceholderScreen title="Cases" icon="folder-open-outline" />);
    expect(screen.getByText('Cases')).toBeTruthy();
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });
  it('FE-001: loading view is announced as busy', () => {
    render(<LoadingView label="Loading" />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });
  it('FE-001: error view shows message', () => {
    render(<ErrorView message="Boom" />);
    expect(screen.getByText('Boom')).toBeTruthy();
  });
});
