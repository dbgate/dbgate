import _ from 'lodash';
import { recentDatabases, currentDatabase, getRecentDatabases } from '../stores';
import registerCommand from './registerCommand';

currentDatabase.subscribe(value => {
  console.log('DB', value);
  if (!value) return;
  recentDatabases.update(list => {
    const res = [
      value,
      ..._.compact(list).filter(x => x.name != value.name || x.connection?._id != value.connection?.id),
    ].slice(0, 10);
    return res;
  });
});

function switchDatabaseCommand(db) {
  return {
    text: `${db.name} on ${db?.connection?.displayName || db?.connection?.server}`,
    onClick: () => currentDatabase.set(db),
  };
}

registerCommand({
  id: 'database.switch',
  category: 'Database',
  name: 'Change to recent',
  keyText: 'Ctrl+D',
  getSubCommands: () => getRecentDatabases().map(switchDatabaseCommand),
});
