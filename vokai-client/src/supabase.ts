import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export type SupabaseAuthConfig = {
  url: string;
  publishable_key: string;
};

export function createVokaiSupabase(config: SupabaseAuthConfig): SupabaseClient {
  const client = createClient(config.url, config.publishable_key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  if (Platform.OS !== 'web') {
    client.auth.startAutoRefresh();
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
  }
  return client;
}

export async function signInWithGoogle(supabase: SupabaseClient) {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in could not be started.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success') {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
    if (exchangeError) throw exchangeError;
    return;
  }
  if (result.type !== 'cancel' && result.type !== 'dismiss') throw new Error('Google sign-in was not completed.');
}
