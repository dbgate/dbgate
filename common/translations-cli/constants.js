// @ts-check
//
const defaultLanguage = 'en';

/** @typedef {{ extensions: string[], directories: string[] }} ExtractConfig

/** @type {ExtractConfig} */
const defaultExtractConfig = {
  extensions: ['.js', '.ts', '.svelte'],
  directories: ['app', 'packages/web', 'plugins'],
};

module.exports = {
  defaultLanguage,
  defaultExtractConfig,
};
