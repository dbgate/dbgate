import type { ApplicationDefinition, StoredConnection } from 'dbgate-types';
import { apiCall } from '../utility/api';

export async function saveDbToApp(conid: string, database: string, app: string) {
  if (app == '#new') {
    const folder = await apiCall('apps/create-folder', { folder: database });

    await apiCall('connections/update-database', {
      conid,
      database,
      values: {
        [`useApp:${folder}`]: true,
      },
    });

    return folder;
  }

  await apiCall('connections/update-database', {
    conid,
    database,
    values: {
      [`useApp:${app}`]: true,
    },
  });

  return app;
}

export function filterAppsForDatabase(connection, database: string, $apps): ApplicationDefinition[] {
  const db = (connection?.databases || []).find(x => x.name == database);
  return $apps?.filter(app => db && db[`useApp:${app.name}`]);
}
