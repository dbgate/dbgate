export default function resolveApi() {
  if (window['require']) {
    const electron = window['require']('electron');

    if (electron) {
      const port = electron.remote.getGlobal('port');
      if (port) {
        return `http://localhost:${port}`;
      }
    }
  }

  // // eslint-disable-next-line
  // const apiUrl = process.env.REACT_APP_API_URL;
  // if (apiUrl) {
  //   if (apiUrl == 'ORIGIN') return window.location.origin;
  //   return apiUrl;
  // }

  return 'http://localhost:3000';
}
