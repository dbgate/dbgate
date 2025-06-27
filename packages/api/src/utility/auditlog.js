// *** This file is part of DbGate Premium ***

const { getLogger, extractErrorLogData } = require('dbgate-tools');
const { storageSqlCommandFmt, storageSelectFmt } = require('../controllers/storageDb');
const logger = getLogger('auditLog');
const _ = require('lodash');

let auditLogQueue = [];
let isProcessing = false;
let isPlanned = false;

function nullableSum(a, b) {
  const res = (a || 0) + (b || 0);
  return res == 0 ? null : res;
}

async function processAuditLogQueue() {
  do {
    isProcessing = true;
    const elements = [...auditLogQueue];
    auditLogQueue = [];

    while (elements.length > 0) {
      const element = elements.shift();
      if (!element) continue;
      if (element.sessionId && element.sessionGroup && element.sessionParam) {
        const existingRows = await storageSelectFmt(
          '^select ~id, ~sumint_1, ~sumint_2  from ~audit_log where ~session_id = %v and ~session_group = %v and ~session_param = %v',
          element.sessionId,
          element.sessionGroup,
          element.sessionParam
        );
        if (existingRows && existingRows.length > 0) {
          const existing = existingRows[0];
          await storageSqlCommandFmt(
            '^update ~audit_log set ~sumint_1 = %v, ~sumint_2 = %v, ~modified = %v where ~id = %v',
            nullableSum(element.sumint1, existing.sumint_1),
            nullableSum(element.sumint2, existing.sumint_2),
            element.created,
            existing.id
          );
          // only update existing session
          continue;
        }
      }
      try {
        let connectionData = null;
        if (element.conid) {
          const connections = await storageSelectFmt('^select * from ~connections where ~conid = %v', element.conid);
          if (connections[0])
            connectionData = _.pick(connections[0], [
              'displayName',
              'engine',
              'displayName',
              'databaseUrl',
              'singleDatabase',
              'server',
              'databaseFile',
              'useSshTunnel',
              'sshHost',
              'defaultDatabase',
            ]);
        }

        const detailText = _.isPlainObject(element.detail) ? JSON.stringify(element.detail) : element.detail || null;
        const connectionDataText = connectionData ? JSON.stringify(connectionData) : null;
        await storageSqlCommandFmt(
          `^insert ^into ~audit_log (
            ~user_id, ~user_login, ~created, ~category, ~component, ~event, ~detail, ~detail_full_length, ~action, ~severity, 
            ~conid, ~database, ~schema_name, ~pure_name, ~sumint_1, ~sumint_2, ~session_id, ~session_group, ~session_param, ~connection_data, ~message) 
            values (%v, %v, %v, %v, %v, %v, %v, %v, %v, %v, %v, %v, %v, %v, %v, %v, %v, %v, %v, %v, %v)`,
          element.userId || null,
          element.login || null,
          element.created,
          element.category || null,
          element.component || null,
          element.event || null,
          detailText?.slice(0, 1000) || null,
          detailText?.length || null,
          element.action || null,
          element.severity || 'info',
          element.conid || null,
          element.database || null,
          element.schemaName || null,
          element.pureName || null,
          element.sumint1 || null,
          element.sumint2 || null,
          element.sessionId || null,
          element.sessionGroup || null,
          element.sessionParam || null,
          connectionDataText?.slice(0, 1000) || null,
          element.message || null
        );
      } catch (err) {
        logger.error(extractErrorLogData(err), 'Error processing audit log entry');
      }
    }

    isProcessing = false;
  } while (auditLogQueue.length > 0);
  isPlanned = false;
}

async function sendToAuditLog(
  req,
  {
    category,
    component,
    event,
    detail = null,
    action,
    severity = 'info',
    conid = null,
    database = null,
    schemaName = null,
    pureName = null,
    sumint1 = null,
    sumint2 = null,
    sessionGroup = null,
    sessionParam = null,
    message = null,
  }
) {
  if (!process.env.STORAGE_DATABASE) {
    return;
  }
  const config = require('../controllers/config');
  const settings = await config.getCachedSettings();
  if (settings?.['storage.useAuditLog'] != 1) {
    return;
  }

  const { login, userId } = req?.user || {};
  const sessionId = req?.headers?.['x-api-session-id'];

  auditLogQueue.push({
    userId,
    login,
    created: new Date().getTime(),
    category,
    component,
    event,
    detail,
    action,
    severity,
    conid,
    database,
    schemaName,
    pureName,
    sumint1,
    sumint2,
    sessionId,
    sessionGroup,
    sessionParam,
    message,
  });
  if (!isProcessing && !isPlanned) {
    setTimeout(() => {
      isPlanned = true;
      processAuditLogQueue();
    }, 0);
  }
}

function maskLogFields(script) {
  return _.cloneDeepWith(script, (value, key) => {
    if (_.isString(key) && key.toLowerCase().includes('password')) {
      return '****';
    }
    if (key == 'query') {
      return '****';
    }
  });
}

function extractConnectionId(connection) {
  if (
    connection?.server == process.env.STORAGE_SERVER &&
    connection?.database == process.env.STORAGE_DATABASE &&
    connection?.port == process.env.STORAGE_PORT
  ) {
    return '__storage';
  }
  if (connection?.conid) {
    return connection.conid;
  }
  return null;
}

function analyseJsonRunnerScript(script) {
  const [assignSource, assignTarget, copyStream] = _.isArray(script?.commands) ? script?.commands : [];
  if (assignSource?.type != 'assign') {
    return null;
  }
  if (assignTarget?.type != 'assign') {
    return null;
  }
  if (copyStream?.type != 'copyStream') {
    return null;
  }

  if (assignTarget?.functionName == 'tableWriter') {
    const pureName = assignTarget?.props?.pureName;
    const schemaName = assignTarget?.props?.schemaName;
    const connection = assignTarget?.props?.connection;
    if (pureName && connection) {
      return {
        category: 'import',
        component: 'RunnersController',
        event: 'import.table',
        action: 'import',
        severity: 'info',
        message: `Importing table ${pureName}`,
        pureName: pureName,
        conid: extractConnectionId(connection),
        database: connection?.database,
        schemaName: schemaName,
        detail: maskLogFields(script),
      };
    }
    return null;
  }

  if (assignSource?.functionName == 'tableReader') {
    const pureName = assignSource?.props?.pureName;
    const schemaName = assignSource?.props?.schemaName;
    const connection = assignSource?.props?.connection;
    if (pureName && connection) {
      return {
        category: 'export',
        component: 'RunnersController',
        event: 'export.table',
        action: 'export',
        severity: 'info',
        message: `Exporting table ${pureName}`,
        pureName: pureName,
        conid: extractConnectionId(connection),
        database: connection?.database,
        schemaName: schemaName,
        detail: maskLogFields(script),
      };
    }
    return null;
  }

  if (assignSource?.functionName == 'queryReader') {
    const connection = assignSource?.props?.connection;
    if (connection) {
      return {
        category: 'export',
        component: 'RunnersController',
        event: 'export.query',
        action: 'export',
        severity: 'info',
        message: 'Exporting query',
        conid: extractConnectionId(connection),
        database: connection?.database,
        detail: maskLogFields(script),
      };
    }
    return null;
  }

  return null;
}

function logJsonRunnerScript(req, script) {
  const analysed = analyseJsonRunnerScript(script);

  if (analysed) {
    sendToAuditLog(req, analysed);
  } else {
    sendToAuditLog(req, {
      category: 'shell',
      component: 'RunnersController',
      event: 'script.run.json',
      action: 'script',
      severity: 'info',
      detail: maskLogFields(script),
      message: 'Running JSON script',
    });
  }
}

module.exports = {
  sendToAuditLog,
  logJsonRunnerScript,
};
