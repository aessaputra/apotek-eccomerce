/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/?(*.)+(spec|test).{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.agent/', '<rootDir>/.agents/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'scenes/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'slices/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'providers/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/__tests__/**',
    '!**/coverage/**',
    '!**/node_modules/**',
  ],
};
