import { derived } from 'svelte/store';
import { cloudConnectionsStore } from '../stores';
import { useCloudContentList, useConnectionList } from '../utility/metadataLoaders';

export function getConnectionColor(
  connections,
  cloudConnectionsStore,
  dbid,
  userColorTarget = 'foreground',
  cssStylePrefix = '',
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
  return `${cssStylePrefix}var(--theme-usercolor-${userColorTarget}-${colorName})`;
}

export function getCloudContentColor(cloudContent, { cntid, folid }, cssStylePrefix = '') {
  if (!cntid || !folid || !cloudContent) return undefined;
  const current = cloudContent.flatMap(x => x.items).find(x => x.cntid == cntid && x.folid == folid);
  const colorName = current?.contentAttributes?.connectionColor;
  if (!colorName) return undefined;
  return `${cssStylePrefix}var(--theme-usercolor-foreground-${colorName})`;
}

export function useConnectionColor(
  dbid,
  userColorTarget: 'foreground' | 'background' | 'statusbar' = 'foreground',
  cssStylePrefix = '',
  useConnectionFallback = true
) {
  const connections = useConnectionList();
  return derived([connections, cloudConnectionsStore], ([$connections, $cloudConnectionsStore]) =>
    getConnectionColor(
      $connections,
      $cloudConnectionsStore,
      dbid,
      userColorTarget,
      cssStylePrefix,
      useConnectionFallback
    )
  );
}

export function useConnectionColorFactory(
  userColorTarget = 'foreground',
  cssStylePrefix = '',
  useConnectionFallback = true
) {
  const connections = useConnectionList();
  return derived(
    [connections, cloudConnectionsStore],
    ([$connections, $cloudConnectionsStore]) =>
      (dbid = null, cssStylePrefixOverride = null, useConnectionFallbackOverride = null) => {
        const res = getConnectionColor(
          $connections,
          $cloudConnectionsStore,
          dbid,
          userColorTarget,
          cssStylePrefixOverride ?? cssStylePrefix,
          useConnectionFallbackOverride ?? useConnectionFallback
        );
        return res;
      }
  );
}

export function useCloudContentColorFactory(cssStylePrefix = '') {
  const contentList = useCloudContentList();
  return derived(
    [contentList],
    ([$contentList]) =>
      (idpack, cssStylePrefixOverride = null) =>
        getCloudContentColor($contentList, idpack, cssStylePrefixOverride ?? cssStylePrefix)
  );
}
