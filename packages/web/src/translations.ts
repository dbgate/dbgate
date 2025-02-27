import enUS from '../../../translations/en-US.json';
import csCZ from '../../../translations/cs-CZ.json';

import MessageFormat, { MessageFunction } from '@messageformat/core';
import { getStringSettingsValue } from './settings/settingsTools';

const translations = {
  'en-US': enUS,
  'cs-CZ': csCZ,
};
const supportedLanguages = Object.keys(translations);

const compiledMessages: Partial<Record<string, Record<string, MessageFunction<'string'>>>> = {};

export function getSelectedLanguage(): string {
  const borwserLanguage = getBrowserLanguage();
  const selectedLanguage = getStringSettingsValue('localization.language', borwserLanguage);

  if (!supportedLanguages.includes(selectedLanguage)) return 'en-US';

  return selectedLanguage;
}

export function getBrowserLanguage(): string {
  if (typeof window !== 'undefined') {
    return (navigator.languages && navigator.languages[0]) || navigator.language || 'en-US';
  }
  return 'en-US';
}

type TranslateOptions = {
  defaultMessage: string;
  values?: Record<string, unknown>;
};

function getTranslation(key: string, defaultMessage: string, language: string) {
  const selectedTranslations = translations[language] ?? enUS;
  const translation = selectedTranslations[key];

  if (!translation) {
    console.warn(`Translation not found for key: ${key}. For language: ${language}`);
    return defaultMessage;
  }

  return translation;
}

export function _t(key: string, options: TranslateOptions): string {
  const { defaultMessage, values } = options;

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
