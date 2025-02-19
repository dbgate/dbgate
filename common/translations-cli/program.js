//@ts-check
const fs = require('fs');
const { program } = require('commander');
const {
  resolveDirs,
  resolveExtensions,
  resolveFile,
  ensureFileDirExists,
  getTranslationChanges,
} = require('./helpers');
const { extractAllTranslations } = require('./extract');

/**
 * @typedef {{ extensions: string[], directories: string[], outputFile: string}} Config
 * @typedef {Config & { verbose?: boolean }} Options
 */

/** @type {Config} */
const defaultConfig = {
  extensions: ['.js', '.ts', '.svelte'],
  directories: ['app', 'packages/web'],
  outputFile: './translations/en-US.json',
};

program.name('dbgate-translations-cli').description('CLI tool for managing translation').version('1.0.0');

program
  .command('extract')
  .description('Extract translation keys from source files')
  .option('-d, --directories <directories...>', 'directories to search', defaultConfig.directories)
  .option('-e, --extensions <extensions...>', 'file extensions to process', defaultConfig.extensions)
  .option('-o, --outputFile <file>', 'output file path', defaultConfig.outputFile)
  .option('-v, --verbose', 'verbose mode')
  .action(async (/** @type {Options} */ options) => {
    try {
      const { directories, extensions, outputFile, verbose } = options;

      const resolvedRirectories = resolveDirs(directories);
      const resolvedExtensions = resolveExtensions(extensions);

      const translations = await extractAllTranslations(resolvedRirectories, resolvedExtensions);

      const resolvedOutputFile = resolveFile(outputFile);
      ensureFileDirExists(resolvedOutputFile);

      /** @type {Record<string, string>} */
      let existingTranslations = {};
      if (fs.existsSync(resolvedOutputFile)) {
        existingTranslations = JSON.parse(fs.readFileSync(resolvedOutputFile, 'utf-8'));
      }

      const { added, removed, updated } = getTranslationChanges(existingTranslations, translations);

      console.log('\nTranslation changes:');
      console.log(`- Added: ${added.length} keys`);
      console.log(`- Removed: ${removed.length} keys`);
      console.log(`- Updated: ${updated.length} keys`);
      console.log(`- Total: ${Object.keys(translations).length} keys`);

      if (verbose) {
        if (added.length > 0) {
          console.log('\nNew keys:');
          added.forEach(key => console.log(`  + ${key}`));
        }

        if (removed.length > 0) {
          console.log('\nRemoved keys:');
          removed.forEach(key => console.log(`  - ${key}`));
        }

        if (updated.length > 0) {
          console.log('\nUpdated keys:');
          updated.forEach(key => {
            console.log(`  ~ ${key}`);
            console.log(`    Old: ${existingTranslations[key]}`);
            console.log(`    New: ${translations[key]}`);
          });
        }
      }

      fs.writeFileSync(resolvedOutputFile, JSON.stringify(translations, null, 2));
    } catch (error) {
      console.error(error);
      console.error('Error during extraction:', error.message);
      process.exit(1);
    }
  });

module.exports = { program };
