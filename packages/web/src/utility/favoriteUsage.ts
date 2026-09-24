import { getConnectionInfo } from './metadataLoaders';
import { getUsageTabName, trackUsage, UsageAnalyticsEvent } from './usageAnalytics';

/** What was stored in a favorite: the tab itself, a copy of a saved file's content, or a link to the file. */
export function getFavoriteKind(favorite, whatToSave?: string): string {
  if (whatToSave == 'content') return 'content';
  return favorite?.props?.savedFile ? 'file_link' : 'tab';
}

/**
 * Records a favorites event. The tab type and engine are derived from the favorite (or saved tab),
 * never its title, URL path or content.
 */
export function trackFavorite(action: string, favorite?, event: Partial<UsageAnalyticsEvent> = {}): void {
  void (async () => {
    let engine: string | undefined;
    const conid = favorite?.props?.conid;
    if (conid) {
      try {
        engine = (await getConnectionInfo({ conid }))?.engine;
      } catch {
        // Analytics must not depend on metadata loading.
      }
    }
    trackUsage({
      feature: 'favorites',
      action,
      tab: favorite?.tabComponent ? getUsageTabName(favorite) : 'none',
      engine,
      ...event,
    });
  })();
}
