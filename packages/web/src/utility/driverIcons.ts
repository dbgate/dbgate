import type { EngineDriver, EngineDriverIcon } from 'dbgate-types';

type ThemeType = 'light' | 'dark' | null | undefined;

export function getDriverIcon(driver: EngineDriver | null | undefined, themeType: ThemeType) {
  const icon = driver?.icon as EngineDriverIcon | undefined;
  if (!icon) return null;

  if (typeof icon === 'string') return icon;
  const { light, dark } = icon as { light: string; dark?: string };

  if (themeType === 'dark' && dark) return dark;

  return light || dark || null;
}
