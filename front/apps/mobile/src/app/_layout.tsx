import { createApiClient, createFlowGenerationGateway, createTagListGateway } from '@acrofunjam/api-client';
import { colors, colorsDark, sizes, typography } from '@acrofunjam/ui-tokens';
import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { Unbounded_600SemiBold, Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { LogBox, Text, useColorScheme } from 'react-native';
import { apiAddressOf } from '@/flow-generation/api-address';
import { GeneratorProvider, type GeneratorAdapters } from '@/flow-generation/GeneratorContext';
import { createKvLastShownFlowStore } from '@/flow-generation/kv-last-shown-flow-store';

// Composition root (ADR 0038): the adapters of @acrofunjam/api-client and the device storage, injected through contexts.
// The address of the API is static (process.env.EXPO_PUBLIC_API_URL), set per build profile or in .env.local.
const apiClient = createApiClient({ baseUrl: apiAddressOf(process.env.EXPO_PUBLIC_API_URL) });
const adapters: GeneratorAdapters = {
  flows: createFlowGenerationGateway(apiClient),
  tags: createTagListGateway(apiClient),
  store: createKvLastShownFlowStore(Storage),
};
const queryClient = new QueryClient();

// Development only: offline (airplane mode on the mat, or in the Maestro flows), the bundler cannot be reached and its
// warning would cover the bottom bar. The other warnings stay.
if (__DEV__) LogBox.ignoreLogs(['Cannot connect to Expo CLI']);

/** « AcroFunJam », the same header on every screen (UX-13), a header for screen readers. */
function HeaderTitle() {
  const palette = useColorScheme() === 'dark' ? colorsDark : colors;
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={typography.maxFontScale.title}
      style={{
        fontFamily: typography.fontFamilies.display,
        fontSize: typography.size.lg,
        color: palette.text,
      }}
    >
      AcroFunJam
    </Text>
  );
}

export default function RootLayout() {
  const palette = useColorScheme() === 'dark' ? colorsDark : colors;
  // The fonts of the visual direction (ADR 0031), bundled with the app by expo-font: no request at run time.
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Unbounded_600SemiBold,
    Unbounded_700Bold,
  });
  // A font that fails to load falls back to the platform font rather than blocking the app.
  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GeneratorProvider adapters={adapters}>
        <Stack
          screenOptions={{
            headerTitle: () => <HeaderTitle />,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: palette.background },
            headerTintColor: palette.text,
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: {
              backgroundColor: palette.background,
              borderTopWidth: sizes.borderWidth,
              borderTopColor: palette.divider,
            },
          }}
        >
          <Stack.Screen name="(generateur)/index" />
          <Stack.Screen name="(generateur)/flow" />
        </Stack>
      </GeneratorProvider>
    </QueryClientProvider>
  );
}
