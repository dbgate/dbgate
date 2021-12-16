import getElectron from './getElectron';

let apiUrl = null;
try {
  apiUrl = process.env.API_URL;
} catch {}

export default function resolveApi() {
  const electron = getElectron();
  if (electron?.port) {
    return `http://localhost:${electron.port}`;
  }

  if (apiUrl) {
    return apiUrl;
  }
  return window.location.origin;
}

export function resolveApiHeaders() {
  const electron = getElectron();

  if (electron?.authorization) {
    return {
      Authorization: electron.authorization,
    };
  }

  return {};
}
