import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import {
  QUERY_PERSIST_MAX_AGE_MS,
  queryClient,
  queryPersister,
} from '@/lib/query/query-client';
import { StorageUnavailableError } from '@/lib/storage/storage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: QUERY_PERSIST_MAX_AGE_MS,
        }}
        onError={() => {
          throw new StorageUnavailableError('Failed to restore the persisted query cache.');
        }}>
        <Stack screenOptions={{ headerShown: false }} />
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}
