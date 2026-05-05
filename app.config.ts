import fs from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { ExpoConfig, ConfigContext } from 'expo/config';

type AppEnvironment = 'development' | 'preview' | 'production';

const resolveAppEnvironment = (): AppEnvironment => {
  const environment = process.env.ENV ?? process.env.EAS_BUILD_PROFILE;

  if (environment === 'preview' || environment === 'production') {
    return environment;
  }

  return 'development';
};

const resolveAndroidPackage = (environment: AppEnvironment): string => {
  if (process.env.EXPO_ANDROID_PACKAGE) {
    return process.env.EXPO_ANDROID_PACKAGE;
  }

  if (environment === 'preview') {
    return 'com.apotekecommerce.preview';
  }

  if (environment === 'production') {
    return 'com.apotekecommerce';
  }

  return 'com.apotekecommerce.dev';
};

const resolveIosBundleIdentifier = (environment: AppEnvironment): string => {
  if (process.env.EXPO_IOS_BUNDLE_IDENTIFIER) {
    return process.env.EXPO_IOS_BUNDLE_IDENTIFIER;
  }

  if (environment === 'preview') {
    return 'com.apotekecommerce.preview';
  }

  if (environment === 'production') {
    return 'com.apotekecommerce';
  }

  return 'com.apotekecommerce.dev';
};

const hasGoogleServicesClient = (filePath: string, androidPackage: string): boolean => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  return fs.readFileSync(filePath, 'utf8').includes(`"package_name": "${androidPackage}"`);
};

// Expo CLI only loads .env by default, not .env.dev. When running `npx expo start`
// (without npm run dev), load .env.dev so EXPO_PROJECT_ID and other vars are set.
if (!process.env.EXPO_PROJECT_ID) {
  loadEnv({ path: path.resolve(process.cwd(), '.env.dev') });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const expoProjectId = process.env.EXPO_PROJECT_ID;
  const googleServicesFilePath = path.resolve(process.cwd(), 'google-services.json');
  const appEnvironment = resolveAppEnvironment();
  const androidPackage = resolveAndroidPackage(appEnvironment);
  const shouldIncludeGoogleServicesFile = hasGoogleServicesClient(
    googleServicesFilePath,
    androidPackage,
  );

  if (!expoProjectId) {
    throw new Error(
      'EXPO_PROJECT_ID is required. Set it in .env.dev / .env.prod (or .env.*.example for CI).',
    );
  }
  const expoConfig: ExpoConfig = {
    ...config,
    slug: process.env.EXPO_SLUG ?? 'apotek-ecommerce',
    name: process.env.EXPO_NAME ?? 'Apotek Ecommerce',
    scheme: 'apotek-ecommerce', // Deep linking scheme untuk OAuth redirect
    icon: './assets/images/logo.png', // App icon untuk semua platform
    ios: {
      ...config.ios,
      bundleIdentifier: resolveIosBundleIdentifier(appEnvironment),
      infoPlist: {
        ...(process.env.ENV !== 'production'
          ? {
              NSAppTransportSecurity: {
                NSExceptionDomains: {
                  '100.64.0.0': {
                    NSIncludesSubdomains: true,
                    NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
                    NSTemporaryExceptionMinimumTLSVersion: 'TLSv1.2',
                  },
                  '100.100.100.100': {
                    NSIncludesSubdomains: true,
                    NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
                  },
                },
                NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
              },
            }
          : {}),
      },
    },
    android: {
      ...config.android,
      package: androidPackage,
      ...(shouldIncludeGoogleServicesFile ? { googleServicesFile: './google-services.json' } : {}),
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
      env: appEnvironment,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      regionalApiUrl: process.env.EXPO_PUBLIC_REGIONAL_API_URL ?? 'https://wilayah.id/api',
      postalDataUrl:
        process.env.EXPO_PUBLIC_POSTAL_DATA_URL ??
        'https://raw.githubusercontent.com/ArrayAccess/Indonesia-Postal-And-Area/master/data/json/area/62',
      googlePlacesApiUrl:
        process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_URL ?? 'https://places.googleapis.com/v1',
      googleGeocodingApiUrl:
        process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_API_URL ?? 'https://maps.googleapis.com/maps/api',
      supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
      googleApiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY ?? '',
    },
    plugins: [
      'expo-dev-client',
      'expo-router',
      'expo-asset',
      'expo-secure-store',
      'expo-web-browser',
      [
        'react-native-maps',
        {
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
          iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
        },
      ],
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
      [
        'expo-notifications',
        {
          defaultChannel: 'default',
        },
      ],
    ],
  };
  return expoConfig;
};
