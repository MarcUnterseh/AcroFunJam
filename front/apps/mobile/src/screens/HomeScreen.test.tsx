import { colors, colorsDark } from '@acrofunjam/ui-tokens';
import { render, screen } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { HomeScreen } from './HomeScreen';

const backgroundOf = () => {
  const title = screen.getByRole('header', { name: 'AcroFunJam' });
  return ReactNative.StyleSheet.flatten(title.parent?.parent?.props.style ?? title.parent?.props.style)
    ?.backgroundColor;
};

describe('HomeScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('should display the product name when rendered', async () => {
    await render(<HomeScreen />);

    expect(screen.getByRole('header', { name: 'AcroFunJam' })).toBeOnTheScreen();
  });

  it('should take the dawn palette when the system theme is light', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    await render(<HomeScreen />);

    expect(backgroundOf()).toBe(colors.background);
  });

  it('should take the night palette when the system theme is dark', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await render(<HomeScreen />);

    expect(backgroundOf()).toBe(colorsDark.background);
  });
});
