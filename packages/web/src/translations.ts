import enUS from '../../../translations/en-US.json';
import csCZ from '../../../translations/cs-CZ.json';
import { getStringSettingsValue } from './settings/settingsTools';

const translations = {
  'en-US': enUS,
  'cs-CZ': csCZ,
};

export function getSelectedLanguage(): string {
  const borwserLanguage = getBrowserLanguage();

  const selectedLanguage = getStringSettingsValue('localization.language', borwserLanguage);
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

export function _t(key: string, options: TranslateOptions): string {
  const { defaultMessage } = options;

  const selectedLanguage = getSelectedLanguage();
  const selectedTranslations = translations[selectedLanguage] ?? enUS;

  const translation = selectedTranslations[key];

  if (!translation) {
    console.warn(`Translation not found for key: ${key}. For language: ${selectedLanguage}`);
    return defaultMessage;
  }

  return translation;
}
