module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Tamagui Babel plugin removed for React Native: it still runs the extractor and
      // requireTamaguiCore() fails in Metro context (Unexpected token '{'). Tamagui
      // works at runtime without the plugin; docs say it's optional on native.
      // Re-enable for web-only builds or when using @tamagui/metro-plugin if needed.
      'react-native-worklets/plugin', // must be last (replaces react-native-reanimated/plugin)
    ],
  };
};
