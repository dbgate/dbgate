import _ from 'lodash';
import ScriptWriter from './ScriptWriter';
import getAsArray from '../utility/getAsArray';
import { getConnectionInfo } from '../utility/metadataLoaders';
import { findEngineDriver, findObjectLike } from 'dbgate-tools';
import { findFileFormat } from '../utility/fileformats';

export function getTargetName(extensions, source, values) {
  const key = `targetName_${source}`;
  if (values[key]) return values[key];
  const format = findFileFormat(extensions, values.targetStorageType);
  if (format) {
    const res = format.getDefaultOutputName ? format.getDefaultOutputName(source, values) : null;
    if (res) return res;
    return `${source}.${format.extension}`;
  }
  return source;
}

function extractApiParameters(values, direction, format) {
  const pairs = (format.args || [])
    .filter((arg) => arg.apiName)
    .map((arg) => [arg.apiName, values[`${direction}_${format.storageType}_${arg.name}`]])
    .filter((x) => x[1] != null);
  return _.fromPairs(pairs);
}

async function getConnection(extensions, storageType, conid, database) {
  if (storageType == 'database' || storageType == 'query') {
    const conn = await getConnectionInfo({ conid });
    const driver = findEngineDriver(conn, extensions);
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

function getSourceExpr(extensions, sourceName, values, sourceConnection, sourceDriver) {
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
  if (findFileFormat(extensions, sourceStorageType)) {
    const sourceFile = values[`sourceFile_${sourceName}`];
    const format = findFileFormat(extensions, sourceStorageType);
    if (format && format.readerFunc) {
      return [
        format.readerFunc,
        {
          ...sourceFile,
          ...extractApiParameters(values, 'source', format),
        },
      ];
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

function getTargetExpr(extensions, sourceName, values, targetConnection, targetDriver) {
  const { targetStorageType } = values;
  const format = findFileFormat(extensions, targetStorageType);
  if (format && format.writerFunc) {
    const outputParams = format.getOutputParams && format.getOutputParams(sourceName, values);
    return [
      format.writerFunc,
      {
        ...(outputParams
          ? outputParams
          : {
              fileName: getTargetName(extensions, sourceName, values),
            }),
        ...extractApiParameters(values, 'target', format),
      },
    ];
  }
  if (targetStorageType == 'database') {
    return [
      'tableWriter',
      {
        connection: targetConnection,
        schemaName: values.targetSchemaName,
        pureName: getTargetName(extensions, sourceName, values),
        ...getFlagsFroAction(values[`actionType_${sourceName}`]),
      },
    ];
  }
  if (targetStorageType == 'archive') {
    return [
      'archiveWriter',
      {
        folderName: values.targetArchiveFolder,
        fileName: getTargetName(extensions, sourceName, values),
      },
    ];
  }

  throw new Error(`Unknown target storage type: ${targetStorageType}`);
}

export default async function createImpExpScript(extensions, values, addEditorInfo = true) {
  const script = new ScriptWriter();

  const [sourceConnection, sourceDriver] = await getConnection(
    extensions,
    values.sourceStorageType,
    values.sourceConnectionId,
    values.sourceDatabaseName
  );
  const [targetConnection, targetDriver] = await getConnection(
    extensions,
    values.targetStorageType,
    values.targetConnectionId,
    values.targetDatabaseName
  );

  const sourceList = getAsArray(values.sourceList);
  for (const sourceName of sourceList) {
    const sourceVar = script.allocVariable();
    // @ts-ignore
    script.assign(sourceVar, ...getSourceExpr(extensions, sourceName, values, sourceConnection, sourceDriver));

    const targetVar = script.allocVariable();
    // @ts-ignore
    script.assign(targetVar, ...getTargetExpr(extensions, sourceName, values, targetConnection, targetDriver));

    script.copyStream(sourceVar, targetVar);
    script.put();
  }
  if (addEditorInfo) {
    script.comment('@ImportExportConfigurator');
    script.comment(JSON.stringify(values));
  }
  return script.getScript(extensions);
}

export function getActionOptions(extensions, source, values, targetDbinfo) {
  const res = [];
  const targetName = getTargetName(extensions, source, values);
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

export async function createPreviewReader(extensions, values, sourceName) {
  const [sourceConnection, sourceDriver] = await getConnection(
    extensions,
    values.sourceStorageType,
    values.sourceConnectionId,
    values.sourceDatabaseName
  );
  const [functionName, props] = getSourceExpr(extensions, sourceName, values, sourceConnection, sourceDriver);
  return {
    functionName,
    props: {
      ...props,
      limitRows: 100,
    },
  };
}
