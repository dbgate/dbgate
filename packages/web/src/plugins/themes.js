import * as light from './ThemeLight.svelte';
import * as dark from './ThemeDark.svelte';

export function buildThemes(plugins) {
  const res = [light, dark];
  for (const { content } of plugins) {
    const { themes } = content;
    if (themes) res.push(...themes);
  }
  return res;
}
