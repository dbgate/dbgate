import resolveApi, { resolveApiHeaders } from './resolveApi';
import getElectron from './getElectron';
import uuidv4 from 'uuid/v4';
import { getActiveTab, getOpenedTabs, getCurrentConfig } from '../stores';
import { getSelectedLanguage } from '../translations';
import { isProApp } from './proTools';

const ANALYTICS_ROUTE = 'usage-analytics/events';
const ANALYTICS_STORAGE_KEY = 'dbgateUsageAnalytics';
const ANALYTICS_CONSENT_STORAGE_KEY = 'dbgateUsageAnalyticsConsent';
const ANALYTICS_BATCH_SIZE = 50;
const ANALYTICS_FLUSH_INTERVAL_MS = 30 * 60 * 1000;

interface UsageAnalyticsState {
  installationId: string;
  firstUsedDate: string;
  lastActiveDate: string;
  activeDaysTotal: number;
}

export interface UsageAnalyticsEvent {
  feature: string;
  action: string;
  engine?: string;
  /** Stable type of the tab where the action started, never its user-defined title. */
  tab?: string;
  result?: string;
  durationMs?: number;
  value?: number;
}

let memoryState: UsageAnalyticsState | null = null;
let pendingEvents: Record<string, unknown>[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let memoryConsent: boolean | null = null;
let closeHandlerInstalled = false;
const inFlightBatches = new Set<Promise<unknown>>();

export function getUsageAnalyticsConsent(): boolean | null {
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
  } catch {
    // Fall back to the in-memory choice when storage is unavailable.
  }
  return memoryConsent;
}

export function setUsageAnalyticsConsent(consent: boolean): void {
  memoryConsent = consent;
  try {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, String(consent));
  } catch {
    // The choice still applies for the current session.
  }

  if (!consent) clearPendingEvents();
}

function clearPendingEvents(): void {
  pendingEvents = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `0${date.getMonth() + 1}`.slice(-2);
  const day = `0${date.getDate()}`.slice(-2);
  return `${year}-${month}-${day}`;
}

function isValidState(value: unknown): value is UsageAnalyticsState {
  if (!value || typeof value != 'object') return false;
  const state = value as UsageAnalyticsState;
  return (
    typeof state.installationId == 'string' &&
    typeof state.firstUsedDate == 'string' &&
    typeof state.lastActiveDate == 'string' &&
    Number.isInteger(state.activeDaysTotal) &&
    state.activeDaysTotal > 0
  );
}

function readState(): UsageAnalyticsState | null {
  try {
    const value = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value);
    return isValidState(parsed) ? parsed : null;
  } catch {
    return memoryState;
  }
}

function writeState(state: UsageAnalyticsState): void {
  memoryState = state;
  try {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Analytics must never interfere with DbGate when storage is unavailable.
  }
}

export function initializeUsageAnalytics(): UsageAnalyticsState {
  const today = getLocalDateKey();
  const current = readState();
  const state = current || {
    installationId: uuidv4(),
    firstUsedDate: today,
    lastActiveDate: today,
    activeDaysTotal: 1,
  };

  if (state.lastActiveDate != today) {
    state.lastActiveDate = today;
    state.activeDaysTotal = Math.min(state.activeDaysTotal + 1, 100_000);
  }

  writeState(state);
  if (!closeHandlerInstalled && typeof window !== 'undefined') {
    closeHandlerInstalled = true;
    window['dbgateFlushUsageAnalytics'] = async () => {
      flushUsageAnalytics();
      await Promise.allSettled([...inFlightBatches]);
    };
    window.addEventListener('pagehide', flushUsageAnalytics);
  }
  return state;
}

function daysBetween(firstDate: string, lastDate: string): number {
  const first = Date.parse(`${firstDate}T00:00:00Z`);
  const last = Date.parse(`${lastDate}T00:00:00Z`);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return 0;
  return Math.max(0, Math.min(Math.floor((last - first) / 86_400_000), 100_000));
}

function getAppType(config: any): string {
  if (config?.isElectron) return 'desktop';
  if (config?.isDocker) return 'docker';
  if (config?.storageDatabase) return 'server';
  return 'web';
}

function getPlatform(): string {
  const value = (navigator?.platform || '').toLowerCase();
  if (value.includes('win')) return 'windows';
  if (value.includes('mac')) return 'macos';
  if (value.includes('linux')) return 'linux';
  return 'unknown';
}

function normalizeEngine(engine: string | undefined): string | undefined {
  return engine?.split('@')[0]?.toLowerCase();
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(flushUsageAnalytics, ANALYTICS_FLUSH_INTERVAL_MS);
}

/** Sends and removes one best-effort batch without awaiting the response. */
export function flushUsageAnalytics(): void {
  if (getUsageAnalyticsConsent() !== true) {
    clearPendingEvents();
    return;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pendingEvents.length == 0) return;

  const events = pendingEvents.splice(0, ANALYTICS_BATCH_SIZE);
  if (pendingEvents.length > 0) scheduleFlush();

  try {
    const electron = getElectron();
    if (electron) {
      const request = electron.invoke('usage-analytics-events', { events }).catch(() => {});
      inFlightBatches.add(request);
      void request.finally(() => inFlightBatches.delete(request));
      return;
    }
    void fetch(`${resolveApi()}/${ANALYTICS_ROUTE}`, {
      method: 'POST',
      headers: { ...resolveApiHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      credentials: 'same-origin',
      keepalive: true,
    }).catch(() => {});
  } catch {
    // A failed analytics batch is deliberately dropped without a retry.
  }
}

/** Converts a component name to an anonymous, stable analytics dimension. */
export function getUsageTabName(tab): string {
  return tab?.tabComponent
    ? tab.tabComponent
        .replace(/Tab$/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase()
    : 'none';
}

/** Resolve at action start; asynchronous callbacks should retain this value. */
export function getUsageTab(tabid?: string): string {
  return getUsageTabName(tabid ? getOpenedTabs().find(tab => tab.tabid == tabid) : getActiveTab());
}

/** Adds anonymous usage data to a short-lived, best-effort batch. */
export function trackUsage(event: UsageAnalyticsEvent, tabid?: string): void {
  try {
    if (getUsageAnalyticsConsent() !== true) return;
    const state = initializeUsageAnalytics();
    const config = getCurrentConfig() || {};
    pendingEvents.push({
      ...event,
      tab: event.tab ?? getUsageTab(tabid),
      engine: normalizeEngine(event.engine),
      appType: getAppType(config),
      version: config.version,
      platform: getPlatform(),
      edition: isProApp() ? 'premium' : 'community',
      language: getSelectedLanguage(config.preferrendLanguage),
      activeDaysTotal: state.activeDaysTotal,
      daysSinceInstall: daysBetween(state.firstUsedDate, state.lastActiveDate),
      installationId: state.installationId,
    });

    if (pendingEvents.length >= ANALYTICS_BATCH_SIZE) flushUsageAnalytics();
    else scheduleFlush();
  } catch {
    // Analytics is best-effort and must never affect the application.
  }
}
