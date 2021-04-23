let apiUrl = null;
try {
  apiUrl = process.env.API_URL;
} catch {}

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

  if (apiUrl) {
    return apiUrl;
  }
  return window.location.origin;
}

export function resolveApiHeaders() {
  if (window['require']) {
    const electron = window['require']('electron');

    if (electron) {
      return {
        Authorization: electron.remote.getGlobal('authorization'),
      };
    }
  }
  return {};
}
