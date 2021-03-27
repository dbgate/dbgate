import localforage from 'localforage';

window.onunhandledrejection = async e => {
  console.log('Unhandler error, CRASH!!!', e);
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
    } else {
      localStorage.setItem('lastDbGateCrash', JSON.stringify(new Date().getTime()));
      window.location.reload();
    }
  } else {
    window.alert('Sorry, DbGate has crashed.\nAfter OK DbGate will be reloaded');
    localStorage.setItem('lastDbGateCrash', JSON.stringify(new Date().getTime()));
    window.location.reload();
  }
};
