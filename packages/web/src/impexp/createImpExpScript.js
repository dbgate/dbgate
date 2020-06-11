import _ from 'lodash';
import ScriptWriter from './ScriptWriter';
import getAsArray from '../utility/getAsArray';
import { getConnectionInfo } from '../utility/metadataLoaders';
import engines from '@dbgate/engines';
import { quoteFullName, fullNameFromString } from '@dbgate/datalib';

export default async function createImpExpScript(values) {
  const script = new ScriptWriter();
  if (values.sourceStorageType == 'database') {
    const tables = getAsArray(values.sourceTables);
    for (const table of tables) {
      const sourceVar = script.allocVariable();
      const connection = await getConnectionInfo({ conid: values.sourceConnectionId });
      const driver = engines(connection);

      const fullName = fullNameFromString(table);
      script.assign(sourceVar, 'queryReader', {
        connection: {
          ..._.pick(connection, ['server', 'engine', 'user', 'password', 'port']),
          database: values.sourceDatabaseName,
        },
        sql: `select * from ${quoteFullName(driver.dialect, fullName)}`,
      });

      const targetVar = script.allocVariable();
      if (values.targetStorageType == 'csv') {
        script.assign(targetVar, 'csvWriter', {
          fileName: `${fullName.pureName}.csv`,
        });
      }
      if (values.targetStorageType == 'jsonl') {
        script.assign(targetVar, 'jsonLinesWriter', {
          fileName: `${fullName.pureName}.jsonl`,
        });
      }

      script.copyStream(sourceVar, targetVar);
      script.put();
    }
  }
  return script.s;
}
