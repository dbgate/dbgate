import _ from 'lodash';
import { recentDatabases, currentDatabase, getRecentDatabases } from '../stores';
import registerCommand from './registerCommand';
import { getConnectionLabel } from 'dbgate-tools';
import { switchCurrentDatabase } from '../utility/common';
import { __t } from '../translations';

currentDatabase.subscribe(value => {
  if (!value) return;
  recentDatabases.update(list => {
    const res = [
      value,
      ..._.compact(list).filter(x => x.name != value.name || x.connection?._id != value.connection?._id),
    ].slice(0, 10);
    return res;
  });
});

function switchDatabaseCommand(db) {
  return {
    text: `${db.name} on ${getConnectionLabel(db?.connection, { allowExplicitDatabase: false })}`,
    onClick: () => switchCurrentDatabase(db),
  };
}

registerCommand({
  id: 'database.switch',
  category: __t('command.database', { defaultMessage: 'Database' }),
  name: __t('command.database.changeRecent', { defaultMessage: 'Change to recent' }),
  menuName: __t('command.database.switchRecent', { defaultMessage: 'Switch recent database' }),
  keyText: 'CtrlOrCommand+D',
  getSubCommands: () => getRecentDatabases().map(switchDatabaseCommand),
});
