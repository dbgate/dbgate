//@ts-check
const fs = require('fs');
const { program } = require('commander');
const {
  resolveDirs,
  resolveExtensions,
  getTranslationChanges,
  setLanguageTranslations,
  getAllNonDefaultLanguages,
  updateLanguageTranslations,
  getDefaultTranslations,
} = require('./helpers');
const { extractAllTranslations } = require('./extract');
const { getMissingTranslations } = require('./addMissing');
const { defaultLanguage, defaultExtractConfig } = require('./constants');
const { removeUnusedAllTranslations, removeUnusedForSignelLanguage } = require('./removeUnused');

/**
 * @typedef {import('./constants').ExtractConfig & { verbose?: boolean, ignoreUnused?: boolean }} ExtractOptions
 */

program.name('dbgate-translations-cli').description('CLI tool for managing translation').version('1.0.0');

program
  .command('extract')
  .description('Extract translation keys from source files')
  .option('-d, --directories <directories...>', 'directories to search', defaultExtractConfig.directories)
  .option('-e, --extensions <extensions...>', 'file extensions to process', defaultExtractConfig.extensions)
  .option('-r, --ignoreUnused', 'Ignore unused keys in the output file')
  .option('-v, --verbose', 'verbose mode')
  .action(async (/** @type {ExtractOptions} */ options) => {
    try {
      const { directories, extensions, verbose, ignoreUnused } = options;

      const resolvedRirectories = resolveDirs(directories);
      const resolvedExtensions = resolveExtensions(extensions);

      const extractedTranslations = await extractAllTranslations(resolvedRirectories, resolvedExtensions);
      const defaultTranslations = getDefaultTranslations();

      const { added, removed, updated } = getTranslationChanges(defaultTranslations, extractedTranslations);

      console.log('\nTranslation changes:');
      console.log(`- Added: ${added.length} keys`);
      console.log(`- ${ignoreUnused ? 'Unused' : 'Removed'}: ${removed.length} keys`);
      console.log(`- Updated: ${updated.length} keys`);
      console.log(`- Total: ${Object.keys(extractedTranslations).length} keys`);

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
            console.log(`    Old: ${defaultLanguage[key]}`);
            console.log(`    New: ${extractedTranslations[key]}`);
          });
        }
      }

      if (ignoreUnused) {
        console.log('New translations were saved. Unused keys are kept.\n');
        updateLanguageTranslations(defaultLanguage, extractedTranslations);

        if (verbose) {
          console.log('\nUnused keys:');
          for (const key of removed) {
            console.log(`${key}: "${defaultTranslations[key]}"`);
          }
        }
      } else {
        console.log('Unused keys were removed.\n');
        setLanguageTranslations(defaultLanguage, extractedTranslations);
      }
    } catch (error) {
      console.error(error);
      console.error('Error during extraction:', error.message);
      process.exit(1);
    }
  });

const ALL_LANGUAGES = 'all';

/**
 * @param {string} target
 */
function addMissingTranslations(target) {
  console.log(`Adding missing keys for language: ${target}`);
  const { result, stats } = getMissingTranslations(target);
  console.log(`Added: ${stats.added}, Removed: ${stats.removed}, Total: ${stats.newLength}`);
  setLanguageTranslations(target, result);
  console.log(`New translations for ${target} were saved.`);
}

program
  .command('add-missing')
  .description('Add missing keys for a langauge to the translation file')
  .option('-t, --target <target>', 'language to add missing translations to', ALL_LANGUAGES)
  .action(options => {
    try {
      const { target } = options;
      const languages = getAllNonDefaultLanguages();

      if (target === ALL_LANGUAGES) {
        console.log('Adding missing keys for all languages\n');
        for (const language of languages) {
          addMissingTranslations(language);
          console.log();
        }
      } else {
        addMissingTranslations(target);
      }
    } catch (error) {
      console.error(error);
      console.error('Error during add-missing:', error.message);
      process.exit(1);
    }
  });

program
  .command('remove-unused')
  .description('Remove unused keys from the translation files')
  .option('-t, --target <target>', 'language to add missing translations to', ALL_LANGUAGES)
  .action(async options => {
    try {
      const { target } = options;
      if (target === ALL_LANGUAGES) {
        console.log('Removing unused keys from all languages\n');
        await removeUnusedAllTranslations();
      } else {
        await removeUnusedForSignelLanguage(target);
      }
    } catch (error) {
      console.error(error);
      console.error('Error during add-missing:', error.message);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Check if there are multiple default values for the same key')
  .action(async () => {
    try {
      await extractAllTranslations(defaultExtractConfig.directories, defaultExtractConfig.extensions);
      console.log('No problems found while extracting translations.');
    } catch (error) {
      console.error(error);
      console.error('Error during check:', error.message);
      process.exit(1);
    }
  });

module.exports = { program };
