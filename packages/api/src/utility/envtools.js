const path = require('path');
const _ = require('lodash');
const { safeJsonParse, getDatabaseFileLabel } = require('dbgate-tools');
const crypto = require('crypto');

function extractConnectionsFromEnv(env) {
  if (!env?.CONNECTIONS) {
    return null;
  }

  const connections = _.compact(env.CONNECTIONS.split(',')).map(id => ({
    _id: id,
    engine: env[`ENGINE_${id}`],
    server: env[`SERVER_${id}`],
    user: env[`USER_${id}`],
    password: env[`PASSWORD_${id}`],
    passwordMode: env[`PASSWORD_MODE_${id}`],
    port: env[`PORT_${id}`],
    databaseUrl: env[`URL_${id}`],
    useDatabaseUrl: !!env[`URL_${id}`],
    databaseFile: env[`FILE_${id}`]?.replace(
      '%%E2E_TEST_DATA_DIRECTORY%%',
      path.join(path.dirname(path.dirname(__dirname)), 'e2e-tests', 'tmpdata')
    ),
    socketPath: env[`SOCKET_PATH_${id}`],
    serviceName: env[`SERVICE_NAME_${id}`],
    authType: env[`AUTH_TYPE_${id}`] || (env[`SOCKET_PATH_${id}`] ? 'socket' : undefined),
    defaultDatabase: env[`DATABASE_${id}`] || (env[`FILE_${id}`] ? getDatabaseFileLabel(env[`FILE_${id}`]) : null),
    singleDatabase: !!env[`DATABASE_${id}`] || !!env[`FILE_${id}`],
    displayName: env[`LABEL_${id}`],
    isReadOnly: env[`READONLY_${id}`],
    databases: env[`DBCONFIG_${id}`] ? safeJsonParse(env[`DBCONFIG_${id}`]) : null,
    allowedDatabases: env[`ALLOWED_DATABASES_${id}`]?.replace(/\|/g, '\n'),
    allowedDatabasesRegex: env[`ALLOWED_DATABASES_REGEX_${id}`],
    parent: env[`PARENT_${id}`] || undefined,
    useSeparateSchemas: !!env[`USE_SEPARATE_SCHEMAS_${id}`],
    localDataCenter: env[`LOCAL_DATA_CENTER_${id}`],

    // SSH tunnel
    useSshTunnel: env[`USE_SSH_${id}`],
    sshHost: env[`SSH_HOST_${id}`],
    sshPort: env[`SSH_PORT_${id}`],
    sshMode: env[`SSH_MODE_${id}`],
    sshLogin: env[`SSH_LOGIN_${id}`],
    sshPassword: env[`SSH_PASSWORD_${id}`],
    sshKeyfile: env[`SSH_KEY_FILE_${id}`],
    sshKeyfilePassword: env[`SSH_KEY_FILE_PASSWORD_${id}`],

    // SSL
    useSsl: env[`USE_SSL_${id}`],
    sslCaFile: env[`SSL_CA_FILE_${id}`],
    sslCertFile: env[`SSL_CERT_FILE_${id}`],
    sslCertFilePassword: env[`SSL_CERT_FILE_PASSWORD_${id}`],
    sslKeyFile: env[`SSL_KEY_FILE_${id}`],
    sslRejectUnauthorized: env[`SSL_REJECT_UNAUTHORIZED_${id}`],
    trustServerCertificate: env[`SSL_TRUST_CERTIFICATE_${id}`],
  }));

  return connections;
}

function extractImportEntitiesFromEnv(env) {
  const portalConnections = extractConnectionsFromEnv(env) || [];

  const connections = portalConnections.map((conn, index) => ({
    ...conn,
    id_original: conn._id,
    import_source_id: -1,
    conid: crypto.randomUUID(),
    _id: undefined,
    id: index + 1, // autoincrement id

    useDatabaseUrl: conn.useDatabaseUrl ? 1 : 0,
    isReadOnly: conn.isReadOnly ? 1 : 0,
    useSeparateSchemas: conn.useSeparateSchemas ? 1 : 0,
    trustServerCertificate: conn.trustServerCertificate ? 1 : 0,
    singleDatabase: conn.singleDatabase ? 1 : 0,
    useSshTunnel: conn.useSshTunnel ? 1 : 0,
    useSsl: conn.useSsl ? 1 : 0,
    sslRejectUnauthorized: conn.sslRejectUnauthorized ? 1 : 0,
  }));

  const connectionEnvIdToDbId = {};
  for (const conn of connections) {
    connectionEnvIdToDbId[conn.id_original] = conn.id;
  }

  const connectionsRegex = /^ROLE_(.+)_CONNECTIONS$/;
  const permissionsRegex = /^ROLE_(.+)_PERMISSIONS$/;

  const dbConnectionRegex = /^ROLE_(.+)_DATABASES_(.+)_CONNECTION$/;
  const dbDatabasesRegex = /^ROLE_(.+)_DATABASES_(.+)_DATABASES$/;
  const dbDatabasesRegexRegex = /^ROLE_(.+)_DATABASES_(.+)_DATABASES_REGEX$/;
  const dbPermissionRegex = /^ROLE_(.+)_DATABASES_(.+)_PERMISSION$/;

  const tableConnectionRegex = /^ROLE_(.+)_TABLES_(.+)_CONNECTION$/;
  const tableDatabasesRegex = /^ROLE_(.+)_TABLES_(.+)_DATABASES$/;
  const tableDatabasesRegexRegex = /^ROLE_(.+)_TABLES_(.+)_DATABASES_REGEX$/;
  const tableSchemasRegex = /^ROLE_(.+)_TABLES_(.+)_SCHEMAS$/;
  const tableSchemasRegexRegex = /^ROLE_(.+)_TABLES_(.+)_SCHEMAS_REGEX$/;
  const tableTablesRegex = /^ROLE_(.+)_TABLES_(.+)_TABLES$/;
  const tableTablesRegexRegex = /^ROLE_(.+)_TABLES_(.+)_TABLES_REGEX$/;
  const tablePermissionRegex = /^ROLE_(.+)_TABLES_(.+)_PERMISSION$/;
  const tableScopeRegex = /^ROLE_(.+)_TABLES_(.+)_SCOPE$/;

  const roles = [];
  const role_connections = [];
  const role_permissions = [];
  const role_databases = [];
  const role_tables = [];

  // Permission name to ID mappings
  const databasePermissionMap = {
    view: -1,
    read_content: -2,
    write_data: -3,
    run_script: -4,
    deny: -5,
  };

  const tablePermissionMap = {
    read: -1,
    update_only: -2,
    create_update_delete: -3,
    run_script: -4,
    deny: -5,
  };

  const tableScopeMap = {
    all_objects: -1,
    tables: -2,
    views: -3,
    tables_views_collections: -4,
    procedures: -5,
    functions: -6,
    triggers: -7,
    sql_objects: -8,
    collections: -9,
  };

  // Collect database and table permissions data
  const databasePermissions = {};
  const tablePermissions = {};

  // First pass: collect all database and table permission data
  for (const key in env) {
    const dbConnMatch = key.match(dbConnectionRegex);
    const dbDatabasesMatch = key.match(dbDatabasesRegex);
    const dbDatabasesRegexMatch = key.match(dbDatabasesRegexRegex);
    const dbPermMatch = key.match(dbPermissionRegex);

    const tableConnMatch = key.match(tableConnectionRegex);
    const tableDatabasesMatch = key.match(tableDatabasesRegex);
    const tableDatabasesRegexMatch = key.match(tableDatabasesRegexRegex);
    const tableSchemasMatch = key.match(tableSchemasRegex);
    const tableSchemasRegexMatch = key.match(tableSchemasRegexRegex);
    const tableTablesMatch = key.match(tableTablesRegex);
    const tableTablesRegexMatch = key.match(tableTablesRegexRegex);
    const tablePermMatch = key.match(tablePermissionRegex);
    const tableScopeMatch = key.match(tableScopeRegex);

    // Database permissions
    if (dbConnMatch) {
      const [, roleName, permId] = dbConnMatch;
      if (!databasePermissions[roleName]) databasePermissions[roleName] = {};
      if (!databasePermissions[roleName][permId]) databasePermissions[roleName][permId] = {};
      databasePermissions[roleName][permId].connection = env[key];
    }
    if (dbDatabasesMatch) {
      const [, roleName, permId] = dbDatabasesMatch;
      if (!databasePermissions[roleName]) databasePermissions[roleName] = {};
      if (!databasePermissions[roleName][permId]) databasePermissions[roleName][permId] = {};
      databasePermissions[roleName][permId].databases = env[key]?.replace(/\|/g, '\n');
    }
    if (dbDatabasesRegexMatch) {
      const [, roleName, permId] = dbDatabasesRegexMatch;
      if (!databasePermissions[roleName]) databasePermissions[roleName] = {};
      if (!databasePermissions[roleName][permId]) databasePermissions[roleName][permId] = {};
      databasePermissions[roleName][permId].databasesRegex = env[key];
    }
    if (dbPermMatch) {
      const [, roleName, permId] = dbPermMatch;
      if (!databasePermissions[roleName]) databasePermissions[roleName] = {};
      if (!databasePermissions[roleName][permId]) databasePermissions[roleName][permId] = {};
      databasePermissions[roleName][permId].permission = env[key];
    }

    // Table permissions
    if (tableConnMatch) {
      const [, roleName, permId] = tableConnMatch;
      if (!tablePermissions[roleName]) tablePermissions[roleName] = {};
      if (!tablePermissions[roleName][permId]) tablePermissions[roleName][permId] = {};
      tablePermissions[roleName][permId].connection = env[key];
    }
    if (tableDatabasesMatch) {
      const [, roleName, permId] = tableDatabasesMatch;
      if (!tablePermissions[roleName]) tablePermissions[roleName] = {};
      if (!tablePermissions[roleName][permId]) tablePermissions[roleName][permId] = {};
      tablePermissions[roleName][permId].databases = env[key]?.replace(/\|/g, '\n');
    }
    if (tableDatabasesRegexMatch) {
      const [, roleName, permId] = tableDatabasesRegexMatch;
      if (!tablePermissions[roleName]) tablePermissions[roleName] = {};
      if (!tablePermissions[roleName][permId]) tablePermissions[roleName][permId] = {};
      tablePermissions[roleName][permId].databasesRegex = env[key];
    }
    if (tableSchemasMatch) {
      const [, roleName, permId] = tableSchemasMatch;
      if (!tablePermissions[roleName]) tablePermissions[roleName] = {};
      if (!tablePermissions[roleName][permId]) tablePermissions[roleName][permId] = {};
      tablePermissions[roleName][permId].schemas = env[key];
    }
    if (tableSchemasRegexMatch) {
      const [, roleName, permId] = tableSchemasRegexMatch;
      if (!tablePermissions[roleName]) tablePermissions[roleName] = {};
      if (!tablePermissions[roleName][permId]) tablePermissions[roleName][permId] = {};
      tablePermissions[roleName][permId].schemasRegex = env[key];
    }
    if (tableTablesMatch) {
      const [, roleName, permId] = tableTablesMatch;
      if (!tablePermissions[roleName]) tablePermissions[roleName] = {};
      if (!tablePermissions[roleName][permId]) tablePermissions[roleName][permId] = {};
      tablePermissions[roleName][permId].tables = env[key]?.replace(/\|/g, '\n');
    }
    if (tableTablesRegexMatch) {
      const [, roleName, permId] = tableTablesRegexMatch;
      if (!tablePermissions[roleName]) tablePermissions[roleName] = {};
      if (!tablePermissions[roleName][permId]) tablePermissions[roleName][permId] = {};
      tablePermissions[roleName][permId].tablesRegex = env[key];
    }
    if (tablePermMatch) {
      const [, roleName, permId] = tablePermMatch;
      if (!tablePermissions[roleName]) tablePermissions[roleName] = {};
      if (!tablePermissions[roleName][permId]) tablePermissions[roleName][permId] = {};
      tablePermissions[roleName][permId].permission = env[key];
    }
    if (tableScopeMatch) {
      const [, roleName, permId] = tableScopeMatch;
      if (!tablePermissions[roleName]) tablePermissions[roleName] = {};
      if (!tablePermissions[roleName][permId]) tablePermissions[roleName][permId] = {};
      tablePermissions[roleName][permId].scope = env[key];
    }
  }

  // Second pass: process roles, connections, and permissions
  for (const key in env) {
    const connMatch = key.match(connectionsRegex);
    const permMatch = key.match(permissionsRegex);
    if (connMatch) {
      const roleName = connMatch[1];
      let role = roles.find(r => r.name === roleName);
      if (!role) {
        role = {
          id: roles.length + 1,
          name: roleName,
          import_source_id: -1,
        };
        roles.push(role);
      }
      const connIds = env[key]
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      for (const connId of connIds) {
        const dbId = connectionEnvIdToDbId[connId];
        if (dbId) {
          role_connections.push({
            role_id: role.id,
            connection_id: dbId,
            import_source_id: -1,
          });
        }
      }
    }
    if (permMatch) {
      const roleName = permMatch[1];
      let role = roles.find(r => r.name === roleName);
      if (!role) {
        role = {
          id: roles.length + 1,
          name: roleName,
          import_source_id: -1,
        };
        roles.push(role);
      }
      const permissions = env[key]
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      for (const permission of permissions) {
        role_permissions.push({
          role_id: role.id,
          permission,
          import_source_id: -1,
        });
      }
    }
  }

  // Process database permissions
  for (const roleName in databasePermissions) {
    let role = roles.find(r => r.name === roleName);
    if (!role) {
      role = {
        id: roles.length + 1,
        name: roleName,
        import_source_id: -1,
      };
      roles.push(role);
    }

    for (const permId in databasePermissions[roleName]) {
      const perm = databasePermissions[roleName][permId];
      if (perm.connection && perm.permission) {
        const dbId = connectionEnvIdToDbId[perm.connection];
        const permissionId = databasePermissionMap[perm.permission];
        if (dbId && permissionId) {
          role_databases.push({
            role_id: role.id,
            connection_id: dbId,
            database_names_list: perm.databases || null,
            database_names_regex: perm.databasesRegex || null,
            database_permission_role_id: permissionId,
            id_original: permId,
            import_source_id: -1,
          });
        }
      }
    }
  }

  // Process table permissions
  for (const roleName in tablePermissions) {
    let role = roles.find(r => r.name === roleName);
    if (!role) {
      role = {
        id: roles.length + 1,
        name: roleName,
        import_source_id: -1,
      };
      roles.push(role);
    }

    for (const permId in tablePermissions[roleName]) {
      const perm = tablePermissions[roleName][permId];
      if (perm.connection && perm.permission) {
        const dbId = connectionEnvIdToDbId[perm.connection];
        const permissionId = tablePermissionMap[perm.permission];
        const scopeId = tableScopeMap[perm.scope || 'all_objects'];
        if (dbId && permissionId && scopeId) {
          role_tables.push({
            role_id: role.id,
            connection_id: dbId,
            database_names_list: perm.databases || null,
            database_names_regex: perm.databasesRegex || null,
            schema_names_list: perm.schemas || null,
            schema_names_regex: perm.schemasRegex || null,
            table_names_list: perm.tables || null,
            table_names_regex: perm.tablesRegex || null,
            table_permission_role_id: permissionId,
            table_permission_scope_id: scopeId,
            id_original: permId,
            import_source_id: -1,
          });
        }
      }
    }
  }

  if (connections.length == 0 && roles.length == 0) {
    return null;
  }

  return {
    connections,
    roles,
    role_connections,
    role_permissions,
    role_databases,
    role_tables,
  };
}

function createStorageFromEnvReplicatorItems(importEntities) {
  return [
    {
      name: 'connections',
      findExisting: true,
      createNew: true,
      updateExisting: true,
      matchColumns: ['id_original', 'import_source_id'],
      deleteMissing: true,
      deleteRestrictionColumns: ['import_source_id'],
      skipUpdateColumns: ['conid'],
      jsonArray: importEntities.connections,
    },
    {
      name: 'roles',
      findExisting: true,
      createNew: true,
      updateExisting: true,
      matchColumns: ['name', 'import_source_id'],
      deleteMissing: true,
      deleteRestrictionColumns: ['import_source_id'],
      jsonArray: importEntities.roles,
    },
    {
      name: 'role_connections',
      findExisting: true,
      createNew: true,
      updateExisting: false,
      deleteMissing: true,
      matchColumns: ['role_id', 'connection_id', 'import_source_id'],
      jsonArray: importEntities.role_connections,
      deleteRestrictionColumns: ['import_source_id'],
    },
    {
      name: 'role_permissions',
      findExisting: true,
      createNew: true,
      updateExisting: false,
      deleteMissing: true,
      matchColumns: ['role_id', 'permission', 'import_source_id'],
      jsonArray: importEntities.role_permissions,
      deleteRestrictionColumns: ['import_source_id'],
    },
    {
      name: 'role_databases',
      findExisting: true,
      createNew: true,
      updateExisting: true,
      deleteMissing: true,
      matchColumns: ['role_id', 'id_original', 'import_source_id'],
      jsonArray: importEntities.role_databases,
      deleteRestrictionColumns: ['import_source_id'],
    },
    {
      name: 'role_tables',
      findExisting: true,
      createNew: true,
      updateExisting: true,
      deleteMissing: true,
      matchColumns: ['role_id', 'id_original', 'import_source_id'],
      jsonArray: importEntities.role_tables,
      deleteRestrictionColumns: ['import_source_id'],
    },
  ];
}

module.exports = {
  extractConnectionsFromEnv,
  extractImportEntitiesFromEnv,
  createStorageFromEnvReplicatorItems,
};
