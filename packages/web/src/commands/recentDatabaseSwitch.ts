import _ from 'lodash';
import { recentDatabases, currentDatabase, getRecentDatabases } from '../stores';
import getConnectionLabel from '../utility/getConnectionLabel';
import registerCommand from './registerCommand';

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
    onClick: () => currentDatabase.set(db),
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
