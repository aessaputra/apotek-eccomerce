import fs from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { ExpoConfig, ConfigContext } from 'expo/config';

type AppEnvironment = 'development' | 'preview' | 'production';

type GoogleServicesClient = {
  client_info?: {
    android_client_info?: {
      package_name?: string;
    };
  };
};

type GoogleServicesConfig = {
  client?: GoogleServicesClient[];
};

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

const resolveLocalFilePath = (fileName: string): string => path.resolve(process.cwd(), fileName);

const resolveExistingLocalFile = (fileNames: string[]): string | undefined =>
  fileNames.map(resolveLocalFilePath).find(filePath => fs.existsSync(filePath));

const resolveGoogleServicesJsonPath = (environment: AppEnvironment): string | undefined => {
  if (process.env.GOOGLE_SERVICES_JSON) {
    return path.resolve(process.cwd(), process.env.GOOGLE_SERVICES_JSON);
  }

  const localFileNames: Record<AppEnvironment, string[]> = {
    development: ['google-services.dev.json', 'google-services.json'],
    preview: ['google-services.preview.json'],
    production: ['google-services.prod.json'],
  };

  return resolveExistingLocalFile(localFileNames[environment]);
};

const resolveGoogleServicesPlistPath = (environment: AppEnvironment): string | undefined => {
  if (process.env.GOOGLE_SERVICES_PLIST) {
    return path.resolve(process.cwd(), process.env.GOOGLE_SERVICES_PLIST);
  }

  const localFileNames: Record<AppEnvironment, string[]> = {
    development: ['GoogleService-Info.dev.plist', 'GoogleService-Info.plist'],
    preview: ['GoogleService-Info.preview.plist'],
    production: ['GoogleService-Info.prod.plist'],
  };

  return resolveExistingLocalFile(localFileNames[environment]);
};

const hasGoogleServicesClient = (filePath: string, androidPackage: string): boolean => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const config = JSON.parse(fs.readFileSync(filePath, 'utf8')) as GoogleServicesConfig;

  return (
    config.client?.some(
      client => client.client_info?.android_client_info?.package_name === androidPackage,
    ) ?? false
  );
};

const assertGoogleServicesClient = (filePath: string, androidPackage: string): void => {
  if (!hasGoogleServicesClient(filePath, androidPackage)) {
    throw new Error(
      `Firebase Android config ${filePath} must include package_name "${androidPackage}" for this build profile. Register the matching Firebase Android app and use its google-services.json.`,
    );
  }
};

// Expo CLI only loads .env by default, not .env.dev. When running `npx expo start`
// (without npm run dev), load .env.dev so EXPO_PROJECT_ID and other vars are set.
if (!process.env.EXPO_PROJECT_ID) {
  loadEnv({ path: path.resolve(process.cwd(), '.env.dev') });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const expoProjectId = process.env.EXPO_PROJECT_ID;
  const appEnvironment = resolveAppEnvironment();
  const androidPackage = resolveAndroidPackage(appEnvironment);
  const googleServicesJsonPath = resolveGoogleServicesJsonPath(appEnvironment);
  const googleServicesPlistPath = resolveGoogleServicesPlistPath(appEnvironment);

  if (googleServicesJsonPath) {
    assertGoogleServicesClient(googleServicesJsonPath, androidPackage);
  }

  if (!expoProjectId) {
    throw new Error(
      'EXPO_PROJECT_ID is required. Set it in .env.dev / .env.prod (or .env.*.example for CI).',
    );
  }
  const expoConfig: ExpoConfig = {
    ...config,
    slug: process.env.EXPO_SLUG ?? 'apotek-ecommerce',
    name: process.env.EXPO_NAME ?? 'SiFarma',
    scheme: 'apotek-ecommerce', // Deep linking scheme untuk OAuth redirect
    icon: './assets/images/logo.png', // App icon untuk semua platform
    ios: {
      ...config.ios,
      bundleIdentifier: resolveIosBundleIdentifier(appEnvironment),
      ...(googleServicesPlistPath ? { googleServicesFile: googleServicesPlistPath } : {}),
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
      ...(googleServicesJsonPath ? { googleServicesFile: googleServicesJsonPath } : {}),
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
          image: './assets/images/splash-screen.png',
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
