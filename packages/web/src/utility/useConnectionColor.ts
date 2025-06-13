import { presetPalettes, presetDarkPalettes } from '@ant-design/colors';
import { derived } from 'svelte/store';
import { cloudConnectionsStore, currentThemeDefinition } from '../stores';
import { useCloudContentList, useConnectionList } from '../utility/metadataLoaders';

export function getConnectionColor(
  connections,
  cloudConnectionsStore,
  dbid,
  themeType,
  colorIndex,
  backgroundStyle = false,
  useConnectionFallback = true
) {
  if (!dbid || !connections) return undefined;
  const current = connections.find(x => x._id == dbid.conid) ?? cloudConnectionsStore?.[dbid.conid];
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

export function getCloudContentColor(cloudContent, { cntid, folid }, themeType, colorIndex, backgroundStyle = false) {
  if (!cntid || !folid || !cloudContent) return undefined;
  const current = cloudContent.flatMap(x => x.items).find(x => x.cntid == cntid && x.folid == folid);
  const colorName = current?.contentAttributes?.connectionColor;
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
  return derived([connections, currentThemeDefinition, cloudConnectionsStore], ([$connections, $themeDef, $cloudConnectionsStore]) =>
    getConnectionColor(
      $connections,
      $cloudConnectionsStore,
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
    [connections, currentThemeDefinition, cloudConnectionsStore],
    ([$connections, $themeDef, $cloudConnectionsStore]) =>
      (dbid, colorIndexOverride = null, backgroundStyleOverride = null, useConnectionFallbackOverride = null) =>
        getConnectionColor(
          $connections,
          $cloudConnectionsStore,
          dbid,
          themeType ?? $themeDef?.themeType,
          colorIndexOverride ?? colorIndex,
          backgroundStyleOverride ?? backgroundStyle,
          useConnectionFallbackOverride ?? useConnectionFallback
        )
  );
}

export function useCloudContentColorFactory(colorIndex, themeType = null, backgroundStyle = false) {
  const contentList = useCloudContentList();
  return derived(
    [contentList, currentThemeDefinition],
    ([$contentList, $themeDef]) =>
      (idpack, colorIndexOverride = null, backgroundStyleOverride = null) =>
        getCloudContentColor(
          $contentList,
          idpack,
          themeType ?? $themeDef?.themeType,
          colorIndexOverride ?? colorIndex,
          backgroundStyleOverride ?? backgroundStyle
        )
  );
}
