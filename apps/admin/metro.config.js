const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  inlineVariables: {
    exclude: [
      '--color-primary',
      '--color-primary-foreground',
      '--color-background',
      '--color-surface',
      '--color-foreground',
      '--color-muted-foreground',
      '--color-border',
    ],
  },
});