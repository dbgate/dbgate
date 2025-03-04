import _ from 'lodash';
import { ScriptWriter, ScriptWriterJson } from 'dbgate-tools';
import getAsArray from '../utility/getAsArray';
import { getConnectionInfo } from '../utility/metadataLoaders';
import { findEngineDriver, findObjectLike } from 'dbgate-tools';
import { findFileFormat } from '../plugins/fileformats';
import { getCurrentConfig } from '../stores';

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

function extractFormatApiParameters(values, direction, format) {
  const pairs = (format.args || [])
    .filter(arg => arg.apiName)
    .map(arg => [arg.apiName, values[`${direction}_${format.storageType}_${arg.name}`]])
    .filter(x => x[1] != null);
  return _.fromPairs(pairs);
}

function extractDriverApiParameters(values, direction, driver) {
  const pairs = (driver.importExportArgs || [])
    .filter(arg => arg.apiName)
    .map(arg => [arg.apiName, values[`${direction}_${driver.engine}_${arg.name}`]])
    .filter(x => x[1] != null);
  return _.fromPairs(pairs);
}

export function extractShellConnection(connection, database) {
  const config = getCurrentConfig();

  return config.allowShellConnection
    ? {
        ..._.omitBy(
          _.omit(connection, ['_id', 'displayName', 'databases', 'connectionColor', 'status', 'unsaved']),
          v => !v
        ),
        database,
      }
    : {
        _id: connection._id,
        engine: connection.engine,
        database,
      };
}

async function getConnection(extensions, storageType, conid, database) {
  if (storageType == 'database' || storageType == 'query') {
    const conn = await getConnectionInfo({ conid });
    const driver = findEngineDriver(conn, extensions);
    const connection = extractShellConnection(conn, database);
    return [connection, driver];
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
        ...extractDriverApiParameters(values, 'source', sourceDriver),
        ...fullName,
      },
    ];
  }
  if (sourceStorageType == 'query') {
    return [
      'queryReader',
      {
        connection: sourceConnection,
        ...extractDriverApiParameters(values, 'source', sourceDriver),
        queryType: values.sourceQueryType,
        query: values.sourceQueryType == 'json' ? JSON.parse(values.sourceQuery) : values.sourceQuery,
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
          ..._.omit(sourceFile, ['isDownload']),
          ...extractFormatApiParameters(values, 'source', format),
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
    case 'appendData':
      return {
        createIfNotExists: false,
        truncate: false,
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
        ...extractFormatApiParameters(values, 'target', format),
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
        ...extractDriverApiParameters(values, 'target', targetDriver),
        ...getFlagsFroAction(values[`actionType_${sourceName}`]),
        progressName: sourceName,
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

export function normalizeExportColumnMap(colmap) {
  if (!colmap) {
    return null;
  }
  if (!colmap.find(x => !x.ignore)) {
    // all values are ignored, ignore column map
    return null;
  }
  colmap = colmap.filter(x => !x.skip);
  if (colmap.length > 0) {
    return colmap.map(x => _.omit(x, ['ignore']));
  }
  return null;
}

export default async function createImpExpScript(extensions, values, forceScript = false) {
  const config = getCurrentConfig();
  const script =
    config.allowShellScripting || forceScript
      ? new ScriptWriter(values.startVariableIndex || 0)
      : new ScriptWriterJson(values.startVariableIndex || 0);

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

    const colmap = normalizeExportColumnMap(values[`columns_${sourceName}`]);

    let colmapVar = null;
    if (colmap) {
      colmapVar = script.allocVariable();
      script.assignValue(colmapVar, colmap);
    }

    script.copyStream(sourceVar, targetVar, colmapVar, sourceName);
    script.endLine();
  }
  return script.getScript(values.schedule);
}

export function getActionOptions(extensions, source, values, targetDbinfo) {
  const res = [];
  if (values.targetStorageType == 'database') {
    res.push({
      label: 'Create table/append',
      value: 'createTable',
    });
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
