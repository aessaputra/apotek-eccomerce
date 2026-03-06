// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withTamagui } = require('@tamagui/metro-plugin');

const config = getDefaultConfig(__dirname, { isCSSEnabled: true });
config.resolver = config.resolver ?? {};
config.resolver.sourceExts = [...(config.resolver.sourceExts ?? []), 'mjs'];

// Tamagui metro plugin: enables optimizing compiler + CSS extraction for web
module.exports = withTamagui(config, {
  components: ['tamagui'],
  config: './tamagui.config.ts',
  outputCSS: './tamagui-web.css',
});
