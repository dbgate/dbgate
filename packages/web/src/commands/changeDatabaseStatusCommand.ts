import _ from 'lodash';
import { currentDatabase, getCurrentDatabase, getExtensions } from '../stores';
import getElectron from '../utility/getElectron';
import registerCommand from './registerCommand';
import { apiCall } from '../utility/api';
import { getDatabasStatusMenu, switchCurrentDatabase } from '../utility/common';
import { __t } from '../translations';
import { findEngineDriver } from 'dbgate-tools';

registerCommand({
  id: 'database.changeState',
  category: __t('command.database', { defaultMessage: 'Database' }),
  name: __t('command.database.changeStatus', { defaultMessage: 'Change status' }),
  getSubCommands: () => {
    const current = getCurrentDatabase();
    if (!current) return [];
    const { connection, name } = current;
    const dbid = {
      conid: connection._id,
      database: name,
    };
    const driver = findEngineDriver(connection, getExtensions());

    return getDatabasStatusMenu(dbid, driver);
  },
});
