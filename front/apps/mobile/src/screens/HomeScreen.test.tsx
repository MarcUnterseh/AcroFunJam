import { render, screen } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  it('should display the product name when rendered', async () => {
    await render(<HomeScreen />);

    expect(screen.getByRole('header', { name: 'AcroFunJam' })).toBeOnTheScreen();
  });
});
