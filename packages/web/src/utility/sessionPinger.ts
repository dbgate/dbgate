import { apiCall } from './api';

const pendingPings = new Map<string, Promise<boolean>>();

export function pingSession(sesid: string): Promise<boolean> {
  if (!sesid) {
    return Promise.resolve(false);
  }

  const pendingPing = pendingPings.get(sesid);
  if (pendingPing) {
    return pendingPing;
  }

  const ping: Promise<boolean> = apiCall('sessions/ping', { sesid })
    .then(response => response?.state != 'missing')
    .catch(() => true)
    .finally(() => {
      if (pendingPings.get(sesid) == ping) {
        pendingPings.delete(sesid);
      }
    });

  pendingPings.set(sesid, ping);
  return ping;
}
