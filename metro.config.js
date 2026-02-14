// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, { isCSSEnabled: true });
config.resolver = config.resolver ?? {};
config.resolver.sourceExts = [...(config.resolver.sourceExts ?? []), 'mjs'];

module.exports = config;
