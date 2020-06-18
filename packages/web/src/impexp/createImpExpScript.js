import _ from 'lodash';
import ScriptWriter from './ScriptWriter';
import getAsArray from '../utility/getAsArray';
import { getConnectionInfo } from '../utility/metadataLoaders';
import engines from '@dbgate/engines';
import { findObjectLike } from '@dbgate/datalib';
import { quoteFullName, fullNameFromString } from '@dbgate/datalib';

export default async function createImpExpScript(values) {
  const script = new ScriptWriter();
  if (values.sourceStorageType == 'database') {
    const tables = getAsArray(values.sourceTables);
    for (const table of tables) {
      const sourceVar = script.allocVariable();
      const connection = await getConnectionInfo({ conid: values.sourceConnectionId });
      const driver = engines(connection);

      const fullName = { schemaName: values.sourceSchemaName, pureName: table };
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

export function  getTargetName(source, values) {
  const key = `targetName_${source}`;
  if (values[key]) return values[key];
  if (values.targetStorageType == 'csv') return `${source}.csv`;
  if (values.targetStorageType == 'jsonl') return `${source}.jsonl`;
  return source;
}

export function getActionOptions(source, values,targetDbinfo) {
  const res = [];
  const targetName = getTargetName(source, values);
  if (values.targetStorageType == 'database') {
    let existing = findObjectLike(
      { schemaName: values.targetSchemaName, pureName: targetName },
      targetDbinfo,
      'tables'
    );
    if (existing) {
      res.push({
        label: 'Append data',
        value: 'appendData',
      });
      res.push({
        label: 'Truncate and import',
        value: 'truncate',
      });
      res.push({
        label: 'Drop and create table',
        value: 'dropCreateTable',
      });
    } else {
      res.push({
        label: 'Create table',
        value: 'createTable',
      });
    }
  } else {
    res.push({
      label: 'Create file',
      value: 'createFile',
    });
  }
  return res;
}
