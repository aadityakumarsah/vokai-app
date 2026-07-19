import { requireOptionalNativeModule } from 'expo-modules-core';

type SpeechRecognitionModule = {
  start(options: { lang: string; interimResults: boolean; continuous: boolean; addsPunctuation: boolean; iosTaskHint: string }): void;
  stop(): void;
  abort(): void;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  isRecognitionAvailable(): boolean;
  addListener(eventName: string, listener: (event: any) => void): { remove(): void };
};

// Expo Go and development builds made before this package was added do not
// contain the native module. Loading it optionally keeps the rest of VOKAI
// usable and lets the voice button provide a helpful rebuild message instead.
export const speechRecognitionModule = requireOptionalNativeModule<SpeechRecognitionModule>('ExpoSpeechRecognition');
