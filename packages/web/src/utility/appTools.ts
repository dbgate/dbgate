import type { ApplicationDefinition, DatabaseInfo, StoredConnection } from 'dbgate-types';
import { apiCall } from '../utility/api';
import _ from 'lodash';
import { match } from 'fuzzy';
import { getConnectionInfo } from './metadataLoaders';
import openNewTab from './openNewTab';

// export async function saveDbToApp(conid: string, database: string, app: string) {
//   const connection = await getConnectionInfo({ conid });

//   if (app == '#new') {
//     const appJson = {
//       applicationName: _.startCase(database),
//       usageRules: [
//         {
//           serverHostsList: connection?.server ? [connection.server] : undefined,
//           databaseNamesList: [database],
//           conditionGroup: '1',
//         },
//       ],
//     };

//     const file =

//     const folder = await apiCall('apps/create-folder', { folder: database });

//     await apiCall('connections/update-database', {
//       conid,
//       database,
//       values: {
//         [`useApp:${folder}`]: true,
//       },
//     });

//     return folder;
//   }

//   await apiCall('connections/update-database', {
//     conid,
//     database,
//     values: {
//       [`useApp:${app}`]: true,
//     },
//   });

//   return app;
// }

export function filterAppsForDatabase(
  connection,
  database: string,
  apps: ApplicationDefinition[],
  dbinfo: DatabaseInfo = null
): ApplicationDefinition[] {
  if (!apps) {
    return [];
  }
  // console.log('ALL APPS:', apps);
  // console.log('DB INFO:', dbinfo);
  // console.log('CONNECTION:', connection);
  // console.log('DATABASE:', database);
  return apps.filter(app => {
    const groupedConditions = _.groupBy(app.usageRules, rule => rule.conditionGroup || '1');
    for (const group of Object.values(groupedConditions)) {
      let groupMatch = true;
      for (const rule of group) {
        let ruleMatch = true;
        if (rule.serverHostsRegex) {
          const re = new RegExp(rule.serverHostsRegex);
          ruleMatch = ruleMatch && !!connection?.server && re.test(connection.server);
        }
        if (rule.serverHostsList) {
          ruleMatch = ruleMatch && !!connection?.server && rule.serverHostsList.includes(connection.server);
        }
        if (rule.databaseNamesRegex) {
          const re = new RegExp(rule.databaseNamesRegex);
          ruleMatch = ruleMatch && !!database && re.test(database);
        }
        if (rule.databaseNamesList) {
          ruleMatch = ruleMatch && !!database && rule.databaseNamesList.includes(database);
        }
        let matchedTables = dbinfo?.tables;
        if (rule.tableNamesRegex) {
          const re = new RegExp(rule.tableNamesRegex);
          matchedTables = dbinfo?.tables?.filter(table => !!table && re.test(table.pureName)) || [];
          ruleMatch = ruleMatch && matchedTables.length > 0;
        }
        if (rule.tableNamesList) {
          matchedTables =
            dbinfo?.tables?.filter(table => !!table && rule.tableNamesList.includes(table.pureName)) || [];
          ruleMatch = ruleMatch && matchedTables.length > 0;
        }
        if (rule.columnNamesRegex) {
          const re = new RegExp(rule.columnNamesRegex);
          ruleMatch =
            ruleMatch &&
            matchedTables.some(table => !!table?.columns?.some(column => !!column && re.test(column.columnName)));
        }
        if (rule.columnNamesList) {
          ruleMatch =
            ruleMatch &&
            matchedTables.some(
              table => !!table?.columns?.some(column => !!column && rule.columnNamesList.includes(column.columnName))
            );
        }
        groupMatch = groupMatch && ruleMatch;
      }
      if (groupMatch) return true;
    }
    return false;
  });
  // const db = (connection?.databases || []).find(x => x.name == database);
  // return apps?.filter(app => db && db[`useApp:${app.name}`]);
}

export async function openApplicationEditor(appid) {
  const dataContent = await apiCall('files/load', { folder: 'apps', file: appid, format: 'json' });
  openNewTab(
    {
      title: appid,
      icon: 'img app',
      tabComponent: 'AppEditorTab',
      props: {
        savedFile: appid,
        savedFolder: 'apps',
        savedFormat: 'json',
      },
    },
    { editor: dataContent }
  );
}
