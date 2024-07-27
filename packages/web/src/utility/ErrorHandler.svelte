<script lang="ts">
  import localforage from 'localforage';
  import _ from 'lodash';
  import { TabDefinition } from '../stores';
  import getElectron from './getElectron';
  import { getOpenedTabsStorageName } from './pageDefs';

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

        if (lastDbGateCrash && new Date().getTime() - lastDbGateCrash < 30 * 1000) {
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
