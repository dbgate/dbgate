import _ from 'lodash';
import { currentDatabase, getCurrentDatabase } from '../stores';
import getElectron from '../utility/getElectron';
import registerCommand from './registerCommand';
import { apiCall } from '../utility/api';
import { switchCurrentDatabase } from '../utility/common';

registerCommand({
  id: 'database.changeState',
  category: 'Database',
  name: 'Change status',
  getSubCommands: () => {
    const current = getCurrentDatabase();
    if (!current) return [];
    const { connection, name } = current;
    const dbid = {
      conid: connection._id,
      database: name,
    };
    return [
      {
        text: 'Sync model (incremental)',
        onClick: () => {
          apiCall('database-connections/sync-model', dbid);
        },
      },
      {
        text: 'Sync model (full)',
        onClick: () => {
          apiCall('database-connections/sync-model', { ...dbid, isFullRefresh: true });
        },
      },
      {
        text: 'Reopen',
        onClick: () => {
          apiCall('database-connections/refresh', dbid);
        },
      },
      {
        text: 'Disconnect',
        onClick: () => {
          const electron = getElectron();
          if (electron) apiCall('database-connections/disconnect', dbid);
          switchCurrentDatabase(null);
        },
      },
    ];
  },
});
