//@ts-check
const { getDefaultTranslations, getLanguageTranslations } = require('./helpers');

/**
 * @param {string} language
 */
function getMissingTranslations(language) {
  const source = getDefaultTranslations();
  /** @type {Record<string, string>} */
  let target;

  try {
    target = getLanguageTranslations(language);
  } catch {
    console.log(`Language ${language} not found, creating a new one`);
    target = {};
  }

  let added = 0;
  let removed = 0;

  for (const key in source) {
    if (!target[key]) {
      target[key] = `*** ${source[key]}`;
      added++;
    }
  }

  for (const key in target) {
    if (!source[key]) {
      delete target[key];
      removed++;
    }
  }

  const newLength = Object.keys(target).length;

  return { result: target, stats: { added, removed, newLength } };
}

module.exports = {
  getMissingTranslations,
};
