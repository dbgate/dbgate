<script lang="ts">
  import localforage from 'localforage';

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

        if (lastDbGateCrash && new Date().getTime() - lastDbGateCrash < 30 * 1000) {
          if (
            window.confirm(
              'Sorry, DbGate has crashed again.\nDo you want to clear local user data to avoid crashing after next reload?'
            )
          ) {
            localStorage.clear();
            try {
              await localforage.clear();
            } catch (err) {
              console.error('Error clearing app data', err);
            }
            window.location.reload();
          }
        } else {
          if (
            window.confirm(
              'Sorry, DbGate has crashed.\nPress OK for reload application\nPress Cancel and inspect Console in Developer tools for error details'
            )
          ) {
            localStorage.setItem('lastDbGateCrash', JSON.stringify(new Date().getTime()));
            window.location.reload();
          }
        }
      }
    }, 500);
  };
</script>

<svelte:window on:unhandledrejection={onunhandledrejection} />
