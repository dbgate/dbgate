import ScriptCreator from './ScriptCreator';
import getAsArray from '../utility/getAsArray';
import { getConnectionInfo } from '../utility/metadataLoaders';
import engines from '@dbgate/engines';

function splitFullName(name) {
  const i = name.indexOf('.');
  if (i >= 0)
    return {
      schemaName: name.substr(0, i),
      pureName: name.substr(i + 1),
    };
  return {
    schemaName: null,
    pureName: name,
  };
}
function quoteFullName(dialect, { schemaName, pureName }) {
  if (schemaName) return `${dialect.quoteIdentifier(schemaName)}.${dialect.quoteIdentifier(pureName)}`;
  return `${dialect.quoteIdentifier(pureName)}`;
}

export default async function createImpExpScript(values) {
  const script = new ScriptCreator();
  if (values.sourceStorageType == 'database') {
    const tables = getAsArray(values.sourceTables);
    for (const table of tables) {
      const sourceVar = script.allocVariable();
      const connection = await getConnectionInfo({ conid: values.sourceConnectionId });
      const driver = engines(connection);

      const fullName = splitFullName(table);
      script.assign(sourceVar, 'queryReader', {
        connection: {
          ...connection,
          database: values.sourceDatabaseName,
        },
        sql: `select * from ${quoteFullName(driver.dialect, fullName)}`,
      });

      const targetVar = script.allocVariable();
      script.assign(targetVar, 'csvWriter', {
        fileName: `${fullName.pureName}.csv`,
      });

      script.copyStream(sourceVar, targetVar);
    }
  }
  return script.getCode();
}
