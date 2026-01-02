import type { ThemeDefinition } from 'dbgate-types';
import { derived, writable } from 'svelte/store';
import { themeDarkColors } from './themeDarkColors';
import { themeLightColors } from './themeLightColors';
import getElectron from '../utility/getElectron';
import { writableSettingsValue, writableWithStorage } from '../stores';
import { showModal } from '../modals/modalTools';
import InputTextModal from '../modals/InputTextModal.svelte';
import { _t } from '../translations';
import { apiCall } from '../utility/api';

export const themeLight: ThemeDefinition = {
  themeName: 'Light',
  themeType: 'light',
  isBuiltInTheme: true,
  themeVariables: null,
};
export const themeDark: ThemeDefinition = {
  themeName: 'Dark',
  themeType: 'dark',
  isBuiltInTheme: true,
  themeVariables: null,
};

const darkModeMediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export const systemThemeTypeStore = writable(darkModeMediaQuery?.matches ? 'dark' : 'light');

if (darkModeMediaQuery) {
  darkModeMediaQuery.addEventListener('change', e => {
    systemThemeTypeStore.set(e.matches ? 'dark' : 'light');
  });
}

export function getSystemThemeType() {
  return darkModeMediaQuery?.matches ? 'dark' : 'light';
}

export function applyThemeVariables(themeVariables: { [key: string]: string }) {
  if (!themeVariables) return;

  Object.entries(themeVariables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}

export function getBuiltInTheme(themeType: 'light' | 'dark') {
  if (themeType === 'light') return themeLight;
  if (themeType === 'dark') return themeDark;
  return themeLight;
}

export function applyTheme(theme: ThemeDefinition) {
  const variables = getCompleteThemeVariables(theme);
  applyThemeVariables(variables);
}

export function getCompleteThemeVariables(theme: ThemeDefinition) {
  if (!theme) {
    theme = getBuiltInTheme(getSystemThemeType());
  }

  const baseVariables = theme?.themeType == 'dark' ? themeDarkColors : themeLightColors;
  const allVariables = { ...baseVariables, ...theme.themeVariables };
  return allVariables;
}

function resolveCSSVariable(value: string): string {
  if (!value || typeof value !== 'string') return value;

  // Match var(--variable-name) pattern
  const varRegex = /var\(([^)]+)\)/g;
  let resolvedValue = value;
  let match;

  while ((match = varRegex.exec(value)) !== null) {
    const variableName = match[1].trim();
    const computedValue = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();

    if (computedValue) {
      resolvedValue = resolvedValue.replace(match[0], computedValue);
    }
  }

  return resolvedValue;
}

export function getCurrentCompleteThemeVariables() {
  const theme = getCurrentThemeDefinition();
  const variables = getCompleteThemeVariables(theme);

  // Resolve CSS variable references to actual values
  const resolvedVariables: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(variables)) {
    resolvedVariables[key] = resolveCSSVariable(value);
  }

  return resolvedVariables;
}

export function getBuiltInThemes() {
  return [themeLight, themeDark];
}

export const currentThemeDefinition = getElectron()
  ? writableSettingsValue(null, 'currentThemeDefinition')
  : writableWithStorage(null, 'currentThemeDefinition');

export const currentThemeType = derived(
  [currentThemeDefinition, systemThemeTypeStore],
  ([$theme, $systemThemeTypeStore]) => $theme?.themeType ?? $systemThemeTypeStore
);

let currentThemeDefinitionValue = null;
currentThemeDefinition.subscribe(value => {
  currentThemeDefinitionValue = value;
  applyTheme(value);

  if (currentThemeDefinitionValue) {
    localStorage.setItem('currentThemeType', currentThemeDefinitionValue.themeType);
  } else {
    localStorage.removeItem('currentThemeType');
  }
});
export const getCurrentThemeDefinition = () => currentThemeDefinitionValue;

let currentThemeTypeValue = null;
currentThemeType.subscribe(value => {
  currentThemeTypeValue = value;
});
export const getCurrentThemeType = () => currentThemeTypeValue;

window['__changeCurrentTheme'] = themeType => {
  currentThemeDefinition.set(getBuiltInTheme(themeType));
};

systemThemeTypeStore.subscribe(value => {
  if (!currentThemeDefinitionValue) {
    applyTheme(getBuiltInTheme(value as any));
  }
});

export async function saveThemeToLocalFile(themeDef?: ThemeDefinition) {
  showModal(InputTextModal, {
    value: 'theme1',
    label: _t('theme.fileName', { defaultMessage: 'Theme file name' }),
    header: _t('theme.saveTheme', { defaultMessage: 'Save theme' }),
    onConfirm: async fileName => {
      const themeData = themeDef || getCurrentThemeDefinition() || getBuiltInTheme(getSystemThemeType());
      const themeDataNamed = {
        ...themeData,
        themeName: fileName,
        isBuiltInTheme: undefined,
      };
      await apiCall('files/save', {
        folder: 'themes',
        file: fileName,
        format: 'text',
        data: JSON.stringify(themeDataNamed, null, 2),
      });
    },
  });
}
