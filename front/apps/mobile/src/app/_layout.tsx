import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { Unbounded_600SemiBold, Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';

// Composition root: adapters from @acrofunjam/api-client are wired here and injected through React contexts.
const queryClient = new QueryClient();

export default function RootLayout() {
  // The fonts of the visual direction (ADR 0031), bundled with the app by expo-font: no request at run time.
  // The family names are those of typography.fontFamilies (@acrofunjam/ui-tokens).
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
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
