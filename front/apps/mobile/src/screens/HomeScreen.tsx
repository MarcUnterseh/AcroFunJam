import { colors, colorsDark, spacing, typography } from '@acrofunjam/ui-tokens';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

/** The palette of the system theme (ADR 0031): the dawn by day, the night when the system is dark. */
const usePalette = () => (useColorScheme() === 'dark' ? colorsDark : colors);

export function HomeScreen() {
  const palette = usePalette();
  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
        AcroFunJam
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    // A family per weight with expo-font: no fontWeight next to it.
    fontFamily: typography.fontFamilies.displayBold,
    fontSize: typography.size.xl,
  },
});
