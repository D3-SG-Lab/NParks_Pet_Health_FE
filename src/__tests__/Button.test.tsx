import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components';

describe('Button', () => {
  it('exposes button role and label and fires onPress', () => {
    const onPress = jest.fn();
    render(<Button label="Contractor" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Contractor' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while loading or disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Go" loading onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Go' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
