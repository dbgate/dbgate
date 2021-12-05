import { presetPalettes, presetDarkPalettes } from '@ant-design/colors';
import { derived } from 'svelte/store';
import { currentThemeDefinition } from '../stores';
import { useConnectionList } from '../utility/metadataLoaders';

export function getConnectionColor(
  connections,
  dbid,
  themeType,
  colorIndex,
  backgroundStyle = false,
  useConnectionFallback = true
) {
  if (!dbid || !connections) return undefined;
  const current = connections.find(x => x._id == dbid.conid);
  const { database } = dbid;
  let colorName = useConnectionFallback || !database ? current?.connectionColor : null;
  const dbConfig = (current?.databases || []).find(x => x.name == database);
  if (dbConfig?.connectionColor) {
    colorName = dbConfig.connectionColor;
  }
  if (!colorName) return undefined;
  const palettes = themeType == 'dark' ? presetDarkPalettes : presetPalettes;
  if (colorIndex == null) return colorName;
  const color = palettes[colorName][colorIndex];
  if (backgroundStyle) return `background:${color}`;
  return color;
}

export function useConnectionColor(
  dbid,
  colorIndex,
  themeType = null,
  backgroundStyle = false,
  useConnectionFallback = true
) {
  const connections = useConnectionList();
  return derived([connections, currentThemeDefinition], ([$connections, $themeDef]) =>
    getConnectionColor(
      $connections,
      dbid,
      themeType ?? $themeDef?.themeType,
      colorIndex,
      backgroundStyle,
      useConnectionFallback
    )
  );
}

export function useConnectionColorFactory(
  colorIndex,
  themeType = null,
  backgroundStyle = false,
  useConnectionFallback = true
) {
  const connections = useConnectionList();
  return derived(
    [connections, currentThemeDefinition],
    ([$connections, $themeDef]) => (
      dbid,
      colorIndexOverride = null,
      backgroundStyleOverride = null,
      useConnectionFallbackOverride = null
    ) =>
      getConnectionColor(
        $connections,
        dbid,
        themeType ?? $themeDef?.themeType,
        colorIndexOverride ?? colorIndex,
        backgroundStyleOverride ?? backgroundStyle,
        useConnectionFallbackOverride ?? useConnectionFallback
      )
  );
}
