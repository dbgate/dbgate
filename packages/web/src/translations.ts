import cs from '../../../translations/cs.json';
import sk from '../../../translations/sk.json';
import de from '../../../translations/de.json';
import fr from '../../../translations/fr.json';
import es from '../../../translations/es.json';
import zh from '../../../translations/zh.json';
import zhTW from '../../../translations/zh-TW.json';
import pt from '../../../translations/pt.json';
import it from '../../../translations/it.json';
import ja from '../../../translations/ja.json';
import ko from '../../../translations/ko.json';

import MessageFormat, { MessageFunction } from '@messageformat/core';
import { getStringSettingsValue } from './settings/settingsTools';
import getElectron from './utility/getElectron';
import { apiCall } from './utility/api';

const translations = {
  en: {},
  cs,
  sk,
  de,
  fr,
  zh,
  'zh-TW': zhTW,
  es,
  pt,
  it,
  ja,
  ko,
};
const supportedLanguages = Object.keys(translations);

const compiledMessages: Partial<Record<string, Record<string, MessageFunction<'string'>>>> = {};

const defaultLanguage = 'en';

let selectedLanguageCache: string | null = null;

export function getSelectedLanguage(preferrendLanguage?: string): string {
  if (selectedLanguageCache) return selectedLanguageCache;

  if (preferrendLanguage == 'auto') {
    preferrendLanguage = getBrowserLanguage();
  }

  const selectedLanguage = getElectron()
    ? getStringSettingsValue('localization.language', preferrendLanguage)
    : localStorage.getItem('selectedLanguage') ?? preferrendLanguage;

  if (!selectedLanguage || !supportedLanguages.includes(selectedLanguage)) return defaultLanguage;
  return selectedLanguage;
}

export async function setSelectedLanguage(language: string) {
  if (getElectron()) {
    await apiCall('config/update-settings', { 'localization.language': language });
  } else {
    localStorage.setItem('selectedLanguage', language);
  }
}

export function saveSelectedLanguageToCache(preferrendLanguage?: string) {
  selectedLanguageCache = getSelectedLanguage(preferrendLanguage);
}

export function getBrowserLanguage(): string {
  if (typeof window !== 'undefined') {
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const language of languages) {
      const browserLanguage = getBrowserLanguageFromLocale(language);
      if (browserLanguage) return browserLanguage;
    }
  }
  return defaultLanguage;
}

export function getBrowserLanguageFromLocale(language: string): string {
  const normalized = language?.replace(/_/g, '-').toLowerCase();
  if (!normalized) return '';

  if (
    normalized == 'zh-tw' ||
    normalized == 'zh-hk' ||
    normalized == 'zh-mo' ||
    normalized == 'zh-hant' ||
    normalized.startsWith('zh-tw-') ||
    normalized.startsWith('zh-hk-') ||
    normalized.startsWith('zh-mo-') ||
    normalized.startsWith('zh-hant-')
  ) {
    return 'zh-TW';
  }

  if (
    normalized == 'zh' ||
    normalized == 'zh-cn' ||
    normalized == 'zh-sg' ||
    normalized == 'zh-hans' ||
    normalized.startsWith('zh-cn-') ||
    normalized.startsWith('zh-sg-') ||
    normalized.startsWith('zh-hans-')
  ) {
    return 'zh';
  }

  return normalized.slice(0, 2);
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

export function _tval(x: any | DefferedTranslationResult): string {
  if (typeof x === 'string') return x;
  if (typeof x?._transKey === 'string') {
    return _t(x._transKey, x._transOptions);
  }
  if (typeof x?._transCallback === 'function') {
    return x._transCallback();
  }
  return x?.toString() || '';
}

export function isDefferedTranslationResult(x: string | DefferedTranslationResult): x is DefferedTranslationResult {
  return typeof x !== 'string' && typeof x?._transKey === 'string';
}
