import _ from 'lodash';
import { currentDatabase, getCurrentDatabase } from '../stores';
import getElectron from '../utility/getElectron';
import registerCommand from './registerCommand';
import { apiCall } from '../utility/api';
import { getDatabasStatusMenu, switchCurrentDatabase } from '../utility/common';
import { __t } from '../translations';

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

    return getDatabasStatusMenu(dbid);
  },
});
