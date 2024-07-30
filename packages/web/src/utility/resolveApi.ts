import getElectron from './getElectron';
import { isAdminPage } from './pageDefs';

let apiUrl = null;
try {
  apiUrl = process.env.API_URL;
} catch {}

export default function resolveApi() {
  if (apiUrl) {
    return apiUrl;
  }
  return (window.location.origin + window.location.pathname).replace(/\/*$/, '');
}

export function resolveApiHeaders() {
  const electron = getElectron();

  const res = {};
  const accessToken = localStorage.getItem(isAdminPage() ? 'adminAccessToken' : 'accessToken');
  if (accessToken) {
    res['Authorization'] = `Bearer ${accessToken}`;
  }
  if (isAdminPage()) {
    res['x-is-admin-page'] = 'true';
  }
  return res;
}
