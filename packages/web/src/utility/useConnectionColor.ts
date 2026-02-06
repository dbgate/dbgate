import { derived } from 'svelte/store';
import { cloudConnectionsStore } from '../stores';
import { useCloudContentList, useConnectionList } from '../utility/metadataLoaders';

export function getConnectionColor(
  connections,
  cloudConnectionsStore,
  dbid,
  userColorTarget = 'foreground',
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
  const style = backgroundStyle ? 'background: ' : '';
  return `${style}var(--theme-usercolor-${userColorTarget}-${colorName})`;
}

export function getCloudContentColor(cloudContent, { cntid, folid }, backgroundStyle = false) {
  if (!cntid || !folid || !cloudContent) return undefined;
  const current = cloudContent.flatMap(x => x.items).find(x => x.cntid == cntid && x.folid == folid);
  const colorName = current?.contentAttributes?.connectionColor;
  if (!colorName) return undefined;
  const style = backgroundStyle ? 'background: ' : '';
  return `${style}var(--theme-usercolor-foreground-${colorName})`;
}

export function useConnectionColor(
  dbid,
  userColorTarget: 'foreground' | 'background' | 'statusbar' = 'foreground',
  backgroundStyle = false,
  useConnectionFallback = true
) {
  const connections = useConnectionList();
  return derived([connections, cloudConnectionsStore], ([$connections, $cloudConnectionsStore]) =>
    getConnectionColor(
      $connections,
      $cloudConnectionsStore,
      dbid,
      userColorTarget,
      backgroundStyle,
      useConnectionFallback
    )
  );
}

export function useConnectionColorFactory(
  userColorTarget = 'foreground',
  backgroundStyle = false,
  useConnectionFallback = true
) {
  const connections = useConnectionList();
  return derived(
    [connections, cloudConnectionsStore],
    ([$connections, $cloudConnectionsStore]) =>
      (dbid = null, backgroundStyleOverride = null, useConnectionFallbackOverride = null) =>
        getConnectionColor(
          $connections,
          $cloudConnectionsStore,
          dbid,
          userColorTarget,
          backgroundStyleOverride ?? backgroundStyle,
          useConnectionFallbackOverride ?? useConnectionFallback
        )
  );
}

export function useCloudContentColorFactory(backgroundStyle = false) {
  const contentList = useCloudContentList();
  return derived(
    [contentList],
    ([$contentList]) =>
      (idpack, backgroundStyleOverride = null) =>
        getCloudContentColor($contentList, idpack, backgroundStyleOverride ?? backgroundStyle)
  );
}
