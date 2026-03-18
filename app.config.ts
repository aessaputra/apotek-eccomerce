import path from 'path';
import { config as loadEnv } from 'dotenv';
import { ExpoConfig, ConfigContext } from 'expo/config';

// Expo CLI only loads .env by default, not .env.dev. When running `npx expo start`
// (without npm run dev), load .env.dev so EXPO_PROJECT_ID and other vars are set.
if (!process.env.EXPO_PROJECT_ID) {
  loadEnv({ path: path.resolve(process.cwd(), '.env.dev') });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const expoProjectId = process.env.EXPO_PROJECT_ID;
  if (!expoProjectId) {
    throw new Error(
      'EXPO_PROJECT_ID is required. Set it in .env.dev / .env.prod (or .env.*.example for CI).',
    );
  }
  const expoConfig: ExpoConfig = {
    ...config,
    slug: process.env.EXPO_SLUG ?? 'apotek-eccomerce',
    name: process.env.EXPO_NAME ?? 'Apotek Eccomerce',
    scheme: 'apotek-eccomerce', // Deep linking scheme untuk OAuth redirect
    icon: './assets/images/logo.png', // App icon untuk semua platform
    ios: {
      ...config.ios,
      bundleIdentifier: process.env.EXPO_IOS_BUNDLE_IDENTIFIER ?? 'com.apotekeccomerce',
    },
    android: {
      ...config.android,
      package: process.env.EXPO_ANDROID_PACKAGE ?? 'com.apotekeccomerce',
      // Use 'resize' mode for consistent keyboard handling with KeyboardAvoidingView.
      // This allows the container to resize when keyboard appears, enabling
      // bottom action buttons to stay above keyboard.
      // @see https://docs.expo.dev/guides/keyboard-handling
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        foregroundImage: './assets/images/logo.png',
        backgroundColor: '#ffffff',
      },
    },
    web: {
      ...config.web,
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/logo.png',
    },
    updates: {
      url: `https://u.expo.dev/${expoProjectId}`,
    },
    extra: {
      ...config.extra,
      eas: { projectId: expoProjectId },
      env: process.env.ENV ?? 'development',
      apiUrl: process.env.API_URL ?? '',
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
    },
    plugins: [
      'expo-router',
      'expo-asset',
      'expo-secure-store',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#ffffff',
          image: './assets/images/logo.png',
          imageWidth: 200,
          resizeMode: 'contain',
        },
      ],
      [
        'expo-font',
        {
          fonts: [
            './assets/fonts/Poppins-Bold.ttf',
            './assets/fonts/Poppins-BoldItalic.ttf',
            './assets/fonts/Poppins-Italic.ttf',
            './assets/fonts/Poppins-Regular.ttf',
            './assets/fonts/Poppins-SemiBold.ttf',
            './assets/fonts/Poppins-SemiBoldItalic.ttf',
          ],
        },
      ],
    ],
  };
  return expoConfig;
};
