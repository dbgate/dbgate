import getElectron from './getElectron';

let apiUrl = null;
try {
  apiUrl = process.env.API_URL;
} catch {}

export default function resolveApi() {
  if (apiUrl) {
    return apiUrl;
  }
  return window.location.href.replace(/\/*$/, '');
}

export function resolveApiHeaders() {
  const electron = getElectron();

  const res = {};
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    res['Authorization'] = `Bearer ${accessToken}`;
  }
  return res;
}
