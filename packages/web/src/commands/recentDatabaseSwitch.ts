import _ from 'lodash';
import { recentDatabases, currentDatabase, getRecentDatabases } from '../stores';
import registerCommand from './registerCommand';
import { getConnectionLabel } from 'dbgate-tools';
import { switchCurrentDatabase } from '../utility/common';

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
  category: 'Database',
  name: 'Change to recent',
  menuName: 'Switch recent database',
  keyText: 'CtrlOrCommand+D',
  getSubCommands: () => getRecentDatabases().map(switchDatabaseCommand),
});
