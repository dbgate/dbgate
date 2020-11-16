import _ from 'lodash';
import ScriptWriter from './ScriptWriter';
import getAsArray from '../utility/getAsArray';
import { getConnectionInfo } from '../utility/metadataLoaders';
import engines from 'dbgate-engines';
import { findObjectLike } from 'dbgate-tools';

export function getTargetName(source, values) {
  const key = `targetName_${source}`;
  if (values[key]) return values[key];
  if (values.targetStorageType == 'csv') return `${source}.csv`;
  if (values.targetStorageType == 'jsonl') return `${source}.jsonl`;
  return source;
}

export function isFileStorage(storageType) {
  return storageType == 'csv' || storageType == 'jsonl' || storageType == 'excel';
}

async function getConnection(storageType, conid, database) {
  if (storageType == 'database' || storageType == 'query') {
    const conn = await getConnectionInfo({ conid });
    const driver = engines(conn);
    return [
      {
        ..._.pick(conn, ['server', 'engine', 'user', 'password', 'port']),
        database,
      },
      driver,
    ];
  }
  return [null, null];
}

function getSourceExpr(sourceName, values, sourceConnection, sourceDriver) {
  const { sourceStorageType } = values;
  if (sourceStorageType == 'database') {
    const fullName = { schemaName: values.sourceSchemaName, pureName: sourceName };
    return [
      'tableReader',
      {
        connection: sourceConnection,
        ...fullName,
      },
    ];
  }
  if (sourceStorageType == 'query') {
    return [
      'queryReader',
      {
        connection: sourceConnection,
        sql: values.sourceSql,
      },
    ];
  }
  if (isFileStorage(sourceStorageType)) {
    const sourceFile = values[`sourceFile_${sourceName}`];
    if (sourceStorageType == 'excel') {
      return ['excelSheetReader', sourceFile];
    }
    if (sourceStorageType == 'jsonl') {
      return ['jsonLinesReader', sourceFile];
    }
    if (sourceStorageType == 'csv') {
      return ['csvReader', sourceFile];
    }
  }
  if (sourceStorageType == 'jsldata') {
    return ['jslDataReader', { jslid: values.sourceJslId }];
  }
  if (sourceStorageType == 'archive') {
    return [
      'archiveReader',
      {
        folderName: values.sourceArchiveFolder,
        fileName: sourceName,
      },
    ];
  }
  throw new Error(`Unknown source storage type: ${sourceStorageType}`);
}

function getFlagsFroAction(action) {
  switch (action) {
    case 'dropCreateTable':
      return {
        createIfNotExists: true,
        dropIfExists: true,
      };
    case 'truncate':
      return {
        createIfNotExists: true,
        truncate: true,
      };
  }

  return {
    createIfNotExists: true,
  };
}

function getTargetExpr(sourceName, values, targetConnection, targetDriver) {
  const { targetStorageType } = values;
  if (targetStorageType == 'csv') {
    return [
      'csvWriter',
      {
        fileName: getTargetName(sourceName, values),
      },
    ];
  }
  if (targetStorageType == 'jsonl') {
    return [
      'jsonLinesWriter',
      {
        fileName: getTargetName(sourceName, values),
      },
    ];
  }
  if (targetStorageType == 'database') {
    return [
      'tableWriter',
      {
        connection: targetConnection,
        schemaName: values.targetSchemaName,
        pureName: getTargetName(sourceName, values),
        ...getFlagsFroAction(values[`actionType_${sourceName}`]),
      },
    ];
  }
  if (targetStorageType == 'archive') {
    return [
      'archiveWriter',
      {
        folderName: values.targetArchiveFolder,
        fileName: getTargetName(sourceName, values),
      },
    ];
  }

  throw new Error(`Unknown target storage type: ${targetStorageType}`);
}

export default async function createImpExpScript(values, addEditorInfo = true) {
  const script = new ScriptWriter();

  const [sourceConnection, sourceDriver] = await getConnection(
    values.sourceStorageType,
    values.sourceConnectionId,
    values.sourceDatabaseName
  );
  const [targetConnection, targetDriver] = await getConnection(
    values.targetStorageType,
    values.targetConnectionId,
    values.targetDatabaseName
  );

  const sourceList = getAsArray(values.sourceList);
  for (const sourceName of sourceList) {
    const sourceVar = script.allocVariable();
    // @ts-ignore
    script.assign(sourceVar, ...getSourceExpr(sourceName, values, sourceConnection, sourceDriver));

    const targetVar = script.allocVariable();
    // @ts-ignore
    script.assign(targetVar, ...getTargetExpr(sourceName, values, targetConnection, targetDriver));

    script.copyStream(sourceVar, targetVar);
    script.put();
  }
  if (addEditorInfo) {
    script.comment('@ImportExportConfigurator');
    script.comment(JSON.stringify(values));
  }
  return script.s;
}

export function getActionOptions(source, values, targetDbinfo) {
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

export async function createPreviewReader(values, sourceName) {
  const [sourceConnection, sourceDriver] = await getConnection(
    values.sourceStorageType,
    values.sourceConnectionId,
    values.sourceDatabaseName
  );
  const [functionName, props] = getSourceExpr(sourceName, values, sourceConnection, sourceDriver);
  return {
    functionName,
    props: {
      ...props,
      limitRows: 100,
    },
  };
}
