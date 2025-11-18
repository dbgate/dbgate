import cs from '../../../translations/cs.json';
import sk from '../../../translations/sk.json';
import de from '../../../translations/de.json';
import fr from '../../../translations/fr.json';
import es from '../../../translations/es.json';
import zh from '../../../translations/zh.json';

import MessageFormat, { MessageFunction } from '@messageformat/core';
import { getStringSettingsValue } from './settings/settingsTools';

const translations = {
  en: {},
  cs,
  sk,
  de,
  fr,
  es,
  zh,
};
const supportedLanguages = Object.keys(translations);

const compiledMessages: Partial<Record<string, Record<string, MessageFunction<'string'>>>> = {};

const defaultLanguage = 'en';

let selectedLanguageCache: string | null = null;

export function getSelectedLanguage(): string {
  if (selectedLanguageCache) return selectedLanguageCache;

  const browserLanguage = getBrowserLanguage();
  const selectedLanguage = getStringSettingsValue('localization.language', browserLanguage);

  if (!supportedLanguages.includes(selectedLanguage)) return defaultLanguage;
  return selectedLanguage;
}

export function saveSelectedLanguageToCache() {
  selectedLanguageCache = getSelectedLanguage();
}

export function getBrowserLanguage(): string {
  return 'en';
  // if (typeof window !== 'undefined') {
  //   return (
  //     (navigator.languages && navigator.languages[0]).slice(0, 2) || navigator.language.slice(0, 2) || defaultLanguage
  //   );
  // }
  // return defaultLanguage;
}

type TranslateOptions = {
  defaultMessage: string;
  values?: Record<string, unknown>;
};

function getTranslation(key: string, defaultMessage: string, language: string) {
  const selectedTranslations = translations[language] ?? {};
  const translation = selectedTranslations[key];

  if (!translation) {
    // console.warn(`Translation not found for key: ${key}. For language: ${language}`);
    return defaultMessage;
  }

  return translation;
}

export function getCurrentTranslations(): Record<string, string> {
  const selectedLanguage = getSelectedLanguage();
  return translations[selectedLanguage] || {};
}

export function _t(key: string, options: TranslateOptions): string {
  const { defaultMessage, values } = options || {};

  const selectedLanguage = getSelectedLanguage();

  if (!compiledMessages[selectedLanguage]) {
    compiledMessages[selectedLanguage] = {};
  }

  if (!compiledMessages[selectedLanguage][key]) {
    const translation = getTranslation(key, defaultMessage, selectedLanguage);
    const complied = new MessageFormat(selectedLanguage).compile(translation);
    compiledMessages[selectedLanguage][key] = complied;
  }

  const compliledTranslation = compiledMessages[selectedLanguage][key];

  return compliledTranslation(values ?? {});
}

export type DefferedTranslationResult = {
  _transKey?: string;
  _transOptions?: TranslateOptions;
  _transCallback?: () => string;
};

export function __t(key: string, options: TranslateOptions): DefferedTranslationResult {
  return {
    _transKey: key,
    _transOptions: options,
  };
}

export function _tval(x: string | DefferedTranslationResult): string {
  if (typeof x === 'string') return x;
  if (typeof x?._transKey === 'string') {
    return _t(x._transKey, x._transOptions);
  }
  if (typeof x?._transCallback === 'function') {
    return x._transCallback();
  }
  return '';
}

export function isDefferedTranslationResult(x: string | DefferedTranslationResult): x is DefferedTranslationResult {
  return typeof x !== 'string' && typeof x?._transKey === 'string';
}
