import { presetPalettes, presetDarkPalettes } from '@ant-design/colors';
import { derived } from 'svelte/store';
import { currentThemeDefinition } from '../stores';
import { useConnectionList } from '../utility/metadataLoaders';

export function getConnectionColor(connections, dbid, themeType, colorIndex, backgroundStyle = false) {
  if (!dbid || !connections) return undefined;
  const current = connections.find(x => x._id == dbid.conid);
  if (!current?.connectionColor) return undefined;
  const palettes = themeType == 'dark' ? presetDarkPalettes : presetPalettes;
  if (colorIndex == null) return current?.connectionColor;
  const color = palettes[current?.connectionColor][colorIndex];
  if (backgroundStyle) return `background:${color}`;
  return color;
}

export function useConnectionColor(dbid, colorIndex, themeType = null, backgroundStyle = false) {
  const connections = useConnectionList();
  return derived([connections, currentThemeDefinition], ([$connections, $themeDef]) =>
    getConnectionColor($connections, dbid, themeType ?? $themeDef?.themeType, colorIndex, backgroundStyle)
  );
}

export function useConnectionColorFactory(colorIndex, themeType = null, backgroundStyle = false) {
  const connections = useConnectionList();
  return derived(
    [connections, currentThemeDefinition],
    ([$connections, $themeDef]) => (dbid, colorIndexOverride = null) =>
      getConnectionColor(
        $connections,
        dbid,
        themeType ?? $themeDef?.themeType,
        colorIndexOverride || colorIndex,
        backgroundStyle
      )
  );
}
