// Jest setup file untuk menangani animasi React Native
import 'react-native-gesture-handler/jestSetup';
import { act } from 'react-test-renderer';

// Mock @react-native-community/netinfo to avoid native module errors
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    }),
  ),
  addEventListener: jest.fn(() => jest.fn()), // Returns unsubscribe function
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Setup untuk menangani Animated API warnings dari Tamagui
// Tamagui menggunakan SpringAnimation yang memicu update state secara async
// Warnings ini tidak mempengaruhi hasil test, jadi kita suppress mereka
const originalError = console.error;

beforeAll(() => {
  // Use fake timers untuk kontrol animasi timing
  jest.useFakeTimers();

  console.error = (...args) => {
    // Suppress act() warnings untuk Animated components dan Icon components
    // karena mereka berasal dari library internal (Tamagui, Expo Icons)
    // yang menggunakan animasi async yang tidak bisa dibungkus dengan act()

    // Convert all arguments to string untuk pattern matching
    const fullMessage = args
      .map(arg => {
        if (typeof arg === 'string') {
          return arg;
        }
        if (typeof arg === 'object' && arg !== null) {
          if (arg.message) {
            return String(arg.message);
          }
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    // Pattern matching untuk act() warnings terkait Animated components
    const isActWarning =
      fullMessage.includes('not wrapped in act') || fullMessage.includes('was not wrapped in act');

    // Check for various Animated-related patterns
    // Pattern yang lebih lengkap untuk menangkap semua variasi pesan error
    const hasAnimatedPattern =
      fullMessage.includes('An update to Animated') ||
      fullMessage.includes('Animated(View)') ||
      fullMessage.includes('Animated(Text)') ||
      fullMessage.includes('SpringAnimation') ||
      fullMessage.includes('AnimatedProps') ||
      fullMessage.includes('AnimatedValue') ||
      fullMessage.includes('Animated.Value') ||
      fullMessage.includes('createAnimatedPropsHook') ||
      (fullMessage.includes('An update to') && fullMessage.includes('Animated'));

    // Check for Icon-related patterns (Expo Icons, vector-icons, etc.)
    // Pesan error bisa dalam format: "An update to Icon inside a test was not wrapped in act(...)"
    const hasIconPattern =
      (fullMessage.includes('An update to') && fullMessage.includes('Icon')) ||
      fullMessage.includes('Icon(') ||
      fullMessage.includes('Icon inside a test') ||
      fullMessage.includes('Icon.setState') ||
      fullMessage.includes('createIconSet');

    // Suppress jika ini adalah act() warning untuk Animated atau Icon components
    if (isActWarning && (hasAnimatedPattern || hasIconPattern)) {
      return; // Suppress warning
    }

    // Log semua error lainnya
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  // Run pending timers setelah setiap test untuk memastikan animasi selesai
  // Ini membantu memastikan semua animasi async selesai sebelum test berikutnya
  if (jest.isMockFunction(setTimeout)) {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.clearAllTimers();
  }
});

afterAll(() => {
  // Restore real timers dan console.error
  jest.useRealTimers();
  console.error = originalError;
});
