const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// On Windows multi-core systems, default worker count (14+) and watching the monorepo root
// node_modules directory exhausts the OS/CRT file descriptor table limit (EMFILE).
// Limit workers to 2 and watch only workspace source directories.
config.maxWorkers = 2;

if (config.watchFolders) {
  config.watchFolders = config.watchFolders.filter(
    (folder) => !folder.endsWith('node_modules') && !folder.includes('.pnpm')
  );
}

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