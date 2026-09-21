<script lang="ts">
  import localforage from 'localforage';
  import _ from 'lodash';
  import type { TabDefinition } from '../stores';
  import getElectron from './getElectron';
  import { getOpenedTabsStorageName } from './pageDefs';
  import { flushUsageAnalytics, trackUsage } from './usageAnalytics';
  import { getErrorCategory } from './errorCategory';
  import { onMount } from 'svelte';

  const CRASH_ACTIONS = ['crash', 'crash_backend'];

  /** Sends the crash immediately; a buffered batch would not survive the reload. */
  function reportCrash(action, category) {
    trackUsage({ feature: 'application', action, param: category });
    flushUsageAnalytics();
  }

  onMount(() => {
    // Crashes which the frontend cannot report itself are recorded by the Electron main
    // process and delivered here when the window is running again.
    const electron = getElectron();
    if (!electron) return;
    const handler = (event, arg) => {
      if (CRASH_ACTIONS.includes(arg?.action)) reportCrash(arg.action, `${arg.param || 'unknown'}`);
    };
    electron.addEventListener('report-crash', handler);
    return () => electron.removeEventListener('report-crash', handler);
  });

  let counter = 0;
  $: counterCopy = counter;

  const onunhandledrejection = async e => {
    console.log('Unhandler error, checking whether crashed', e);
    const oldCounter = counter;
    counter++;
    window.setTimeout(async () => {
      if (counterCopy <= oldCounter) {
        console.log('CRASH DETECTED!!!');
        const lastDbGateCrashJson = localStorage.getItem('lastDbGateCrash');
        const lastDbGateCrash = lastDbGateCrashJson ? JSON.parse(lastDbGateCrashJson) : null;
        // let detail = e?.reason?.stack || '';
        // if (detail) detail = '\n\n' + detail;

        const isRepeatedCrash = !!lastDbGateCrash && new Date().getTime() - lastDbGateCrash < 30 * 1000;
        // param is the category of the error, the error itself is never sent.
        reportCrash('crash', getErrorCategory(e?.reason));

        if (isRepeatedCrash) {
          if (
            window.confirm(
              'Sorry, DbGate has crashed again.\nDo you want to close all tabs in order to avoid crashing after next reload?\nYou can reopen closed tabs in closed tabs history.'
            )
          ) {
            try {
              let openedTabs = (await localforage.getItem<TabDefinition[]>(getOpenedTabsStorageName())) || [];
              if (!_.isArray(openedTabs)) openedTabs = [];
              openedTabs = openedTabs
                .map(tab => (tab.closedTime ? tab : { ...tab, closedTime: new Date().getTime() }))
                .map(tab => ({ ...tab, selected: false }));
              await localforage.setItem(getOpenedTabsStorageName(), openedTabs);
              await localStorage.setItem('selectedWidget', 'history');
            } catch (err) {
              localforage.removeItem(getOpenedTabsStorageName());
            }
            // try {
            //   await localforage.clear();
            // } catch (err) {
            //   console.error('Error clearing app data', err);
            // }
            window.location.reload();
          } else {
            getElectron()?.send('open-dev-tools');
          }
        } else {
          if (
            window.confirm(
              'Sorry, DbGate has crashed.\nPress OK for reload application\nPress Cancel and inspect Console in Developer tools for error details'
            )
          ) {
            localStorage.setItem('lastDbGateCrash', JSON.stringify(new Date().getTime()));
            window.location.reload();
          } else {
            getElectron()?.send('open-dev-tools');
          }
        }
      }
    }, 500);
  };
</script>

<svelte:window on:unhandledrejection={onunhandledrejection} />
