// @ts-check
const { defaultExtractConfig } = require('./constants');
const { extractAllTranslations } = require('./extract');
const { getLanguageTranslations, getAllLanguages, setLanguageTranslations } = require('./helpers');

const { directories, extensions } = defaultExtractConfig;

/**
 * @param {string} language
 * @param {Record<string, string>} source
 */
function getUsedTranslations(language, source) {
  const languageTranslations = getLanguageTranslations(language);

  for (const key in languageTranslations) {
    if (!(key in source)) {
      delete languageTranslations[key];
    }
  }

  return languageTranslations;
}

async function removeUnusedAllTranslations() {
  const source = await extractAllTranslations(directories, extensions);
  const languages = getAllLanguages();

  for (const language of languages) {
    const newTranslations = getUsedTranslations(language, source);
    setLanguageTranslations(language, newTranslations);
  }
}

/**
 * @param {string} language
 */
async function removeUnusedForSignelLanguage(language) {
  const source = await extractAllTranslations(directories, extensions);
  const newTranslations = getUsedTranslations(language, source);
  setLanguageTranslations(language, newTranslations);
}

module.exports = {
  removeUnusedAllTranslations,
  removeUnusedForSignelLanguage,
};
