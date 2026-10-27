const _ = require('lodash');
const {
  hasPermission,
  testStandardPermission,
  testConnectionPermission,
  testDatabaseRolePermission,
  loadPermissionsFromRequest,
  loadDatabasePermissionsFromRequest,
  loadTablePermissionsFromRequest,
  getDatabasePermissionRole,
  getTablePermissionRole,
  getTablePermissionRoleLevelIndex,
} = require('./hasPermission');
const { checkSecureDirectoriesInScript, checkSecureFilePathsWithoutDirectory } = require('./security');
const { archivedir } = require('./directories');
const requireEngineDriver = require('./requireEngineDriver');
const path = require('path');

// JSON scripts (import/export, data deployer, import preview) are built by the web client and run
// on the server, where each `assign` command calls a shell API function with props chosen by the
// client. In the web app only the functions the client generates are allowed, and every
// connection a script uses is checked like the corresponding feature in the UI:
//   reading from a database (table or query reader, e.g. quick export from a data grid) = export
//   (dbops/export), read_content on the database; writing to a database = import (dbops/import),
//   write_data on the database. Writing into the archive needs archive/write.

const FILE_FUNCTIONS = [
  'jsonLinesReader',
  'jsonReader',
  'jslDataReader',
  'archiveReader',
  'jsonLinesWriter',
  'jsonWriter',
  'sqlDataWriter',
  'archiveWriter',
];
const DATABASE_READERS = ['tableReader', 'queryReader'];
const DATABASE_WRITERS = ['tableWriter'];
// readers and writers of file format plugins, e.g. reader@dbgate-plugin-csv
const PLUGIN_FUNCTION_RE = /^[A-Za-z_$][\w$]*@dbgate-plugin-[\w-]+$/;

const SIMPLE_COMMANDS = ['assignValue', 'copyStream', 'endLine', 'endline', 'comment'];

function isWriterFunction(functionName) {
  return /writer/i.test(functionName.split('@')[0]);
}

// a file written by a script lands in the archive - it needs archive/write, as the archive routes
function isArchiveFile(fileName) {
  if (!_.isString(fileName) || (!fileName.includes('/') && !fileName.includes('\\'))) return false;
  const dir = path.resolve(path.dirname(fileName));
  const archive = path.resolve(archivedir());
  return dir == archive || dir.startsWith(archive + path.sep);
}

async function checkConnectionUse(connection, mode, req, hostConnection) {
  let conid;
  let database;
  if (_.isString(connection) || connection == null) {
    // single-connection drivers (DuckDB) use the host connection of eval-json-script
    if (!hostConnection) throw new Error('DBGM-00000 Script uses a connection that is not specified');
    conid = hostConnection.conid;
    database = hostConnection.database;
  } else if (_.isPlainObject(connection)) {
    if (connection._id == null) {
      // a full connection definition (only with SHELL_CONNECTION) - like connections/test
      await require('../controllers/connections').testConnectionDefinitionPermission(connection, req);
      return null;
    }
    conid = connection._id;
    database = connection.database;
  } else {
    throw new Error('DBGM-00000 Invalid connection in script');
  }
  await testConnectionPermission(conid, req);
  await testDatabaseRolePermission(conid, database, mode == 'write' ? 'write_data' : 'read_content', req);
  return { conid, database };
}

// Team Premium table permissions can lower the database role for single tables - writing into a
// table needs create_update_delete on it, as saving table data in the data grid
async function checkTableWrite({ conid, database }, schemaName, pureName, req) {
  if (!process.env.STORAGE_DATABASE) return;
  const loadedPermissions = await loadPermissionsFromRequest(req);
  if (hasPermission('all-tables', loadedPermissions)) return;
  const databasePermissionRole = getDatabasePermissionRole(
    conid,
    database,
    await loadDatabasePermissionsFromRequest(req)
  );
  const role = getTablePermissionRole(
    conid,
    database,
    'tables',
    schemaName,
    pureName,
    await loadTablePermissionsFromRequest(req),
    databasePermissionRole
  );
  if (getTablePermissionRoleLevelIndex(role) < getTablePermissionRoleLevelIndex('create_update_delete')) {
    throw new Error(`DBGM-00000 Permission to write into table ${pureName} not granted`);
  }
}

// Checks one shell API call (an `assign` command, or runners/load-reader)
async function checkShellFunctionCall(functionName, props, req, hostConnection = null) {
  if (!_.isString(functionName)) throw new Error('DBGM-00000 Invalid function in script');
  const isFileFunction = FILE_FUNCTIONS.includes(functionName) || PLUGIN_FUNCTION_RE.test(functionName);
  const isDatabaseFunction = DATABASE_READERS.includes(functionName) || DATABASE_WRITERS.includes(functionName);
  if (!isFileFunction && !isDatabaseFunction) {
    throw new Error(`DBGM-00000 Function ${functionName.substring(0, 100)} is not allowed in scripts`);
  }

  if (functionName == 'archiveWriter' || (isWriterFunction(functionName) && isArchiveFile(props?.fileName))) {
    await testStandardPermission('archive/write', req);
  }

  // archiveReader reads <archivedir>/<folderName> - for a zip without the confinement that
  // resolveArchiveFolder gives an archive folder, so '../../x.zip' would read any zip of the server
  if (functionName == 'archiveReader' && !(isPlainName(props?.folderName) && isPlainName(props?.fileName))) {
    throw new Error('DBGM-00000 Invalid archive folder in script');
  }

  const usesConnection = isDatabaseFunction || props?.connection != null || props?.systemConnection != null;
  if (!usesConnection) return;

  // systemConnection is replaced by the host database of eval-json-script ({ $hostConnection: true },
  // see ScriptWriterEval) and then used instead of connection - so the host database is checked
  let connection = props?.connection;
  if (props?.systemConnection != null) {
    if (!_.isEqual(props.systemConnection, { $hostConnection: true }) || !hostConnection) {
      throw new Error('DBGM-00000 Invalid system connection in script');
    }
    connection = null;
  }

  const mode = isWriterFunction(functionName) ? 'write' : 'read';
  await testStandardPermission(mode == 'write' ? 'dbops/import' : 'dbops/export', req);
  const used = await checkConnectionUse(connection, mode, req, hostConnection);
  if (used && functionName == 'tableWriter') {
    await checkTableWrite(used, props?.schemaName, props?.pureName, req);
  }
  if (functionName == 'queryReader' && props?.queryType != 'json') {
    await checkNativeQueryRead(used, connection, req);
  }
}

// A native query of a document database (MongoDB, ...) is JavaScript the driver evaluates in the
// DbGate process (see readQuery) - it needs what running a script needs, as in
// sessions.executeReader. A structured (json) query is only read.
async function checkNativeQueryRead(used, connection, req) {
  const definition = used ? await require('../controllers/connections').getCore({ conid: used.conid }) : connection;
  if (!definition?.engine) {
    throw new Error('DBGM-00000 Unknown connection in script');
  }
  const driver = requireEngineDriver(definition);
  if (!driver?.databaseEngineTypes?.includes('document')) return;
  await testStandardPermission('dbops/query', req);
  if (used) {
    await testDatabaseRolePermission(used.conid, used.database, 'run_script', req);
  }
}

// a zip of the run directory, into the run directory or the archive
function isAllowedZipCommand(command) {
  const { inputDirectory, outputFile } = command;
  if (inputDirectory != '.' || !_.isString(outputFile)) return false;
  const fileName = outputFile.startsWith('archive:') ? outputFile.substring('archive:'.length) : outputFile;
  return fileName.length > 0 && checkSecureFilePathsWithoutDirectory(fileName) && !fileName.includes('\0');
}

const isPlainName = name => _.isString(name) && name.length > 0 && checkSecureFilePathsWithoutDirectory(name);

// dataReplicator reads <archive or folder>/<item name>.jsonl - only from an archive folder (or zip)
// by its plain name; a folder can be any server directory, so only archive:<name> is allowed
function isAllowedReplicatorSource(options) {
  const { archive, folder, items } = options ?? {};
  if (archive != null && !isPlainName(archive)) return false;
  if (folder != null && !(_.isString(folder) && folder.startsWith('archive:') && isPlainName(folder.substring(8)))) {
    return false;
  }
  return _.isArray(items) && items.every(item => isPlainName(item?.name));
}

// Throws when the request may not run the JSON script. Not called in the desktop app.
async function checkJsonScriptAccess(script, req, { hostConnection = null } = {}) {
  if (!_.isPlainObject(script) || !_.isArray(script.commands)) {
    throw new Error('DBGM-00000 Invalid script');
  }
  if (!checkSecureDirectoriesInScript(script)) {
    throw new Error('DBGM-00284 Unallowed directories in script');
  }
  for (const command of script.commands) {
    const type = command?.type;
    if (SIMPLE_COMMANDS.includes(type)) continue;
    if (type == 'assign') {
      await checkShellFunctionCall(command.functionName, command.props, req, hostConnection);
      continue;
    }
    if (type == 'dataReplicator') {
      if (!isAllowedReplicatorSource(command.options)) {
        throw new Error('DBGM-00000 Unallowed data source in script');
      }
      await testStandardPermission('dbops/import', req);
      await checkConnectionUse(command.options?.connection, 'write', req, hostConnection);
      continue;
    }
    if (type == 'zipDirectory') {
      if (!isAllowedZipCommand(command)) {
        throw new Error('DBGM-00000 Unallowed zip file in script');
      }
      if (command.outputFile.startsWith('archive:')) {
        await testStandardPermission('archive/write', req);
      }
      continue;
    }
    throw new Error(`DBGM-00000 Command ${String(type).substring(0, 100)} is not allowed in scripts`);
  }
}

module.exports = {
  checkJsonScriptAccess,
  checkShellFunctionCall,
};
