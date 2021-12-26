import getElectron from './getElectron';

let apiUrl = null;
try {
  apiUrl = process.env.API_URL;
} catch {}

export default function resolveApi() {
  if (apiUrl) {
    return apiUrl;
  }
  return window.location.origin;
}

export function resolveApiHeaders() {
  const electron = getElectron();

  return {};
}
