const { createBulkInsertStreamBase } = require('dbgate-tools');

function getDataTypeString({ dataTypeCode, scale, length, precision }) {
  switch (dataTypeCode) {
    case 7:
      return 'smallint';

    case 8:
      return 'integer';

    case 9:
      return 'bigint';

    case 10:
      return 'float';

    case 11:
      return 'DOUBLE precision';

    case 12:
      return 'date';

    case 13:
      return 'time';

    case 14:
      return `char(${length})`;

    case 16:
      return `decimal(${precision}, ${scale})`;

    case 27:
      return 'double precision';

    case 35:
      return 'blob';

    case 37:
      return `varchar(${length})`;

    case 261:
      return 'cstring';

    default:
      if (dataTypeCode === null || dataTypeCode === undefined) return 'UNKNOWN';
      return `unknown (${dataTypeCode})`;
  }
}

const eventMap = {
  1: { triggerTiming: 'BEFORE', eventType: 'INSERT' },
  2: { triggerTiming: 'AFTER', eventType: 'INSERT' },
  3: { triggerTiming: 'BEFORE', eventType: 'UPDATE' },
  4: { triggerTiming: 'AFTER', eventType: 'UPDATE' },
  5: { triggerTiming: 'BEFORE', eventType: 'DELETE' },
  6: { triggerTiming: 'AFTER', eventType: 'DELETE' },
  17: { triggerTiming: 'BEFORE', eventType: 'INSERT' }, // OR UPDATE
  18: { triggerTiming: 'AFTER', eventType: 'INSERT' }, // OR UPDATE
  25: { triggerTiming: 'BEFORE', eventType: 'INSERT' }, // OR DELETE
  26: { triggerTiming: 'AFTER', eventType: 'INSERT' }, // OR DELETE
  27: { triggerTiming: 'BEFORE', eventType: 'UPDATE' }, // OR DELETE
  28: { triggerTiming: 'AFTER', eventType: 'UPDATE' }, // OR DELETE
  113: { triggerTiming: 'BEFORE', eventType: 'INSERT' }, // OR UPDATE OR DELETE
  114: { triggerTiming: 'AFTER', eventType: 'INSERT' }, // OR UPDATE OR DELETE
  8192: { triggerTiming: 'BEFORE EVENT', eventType: null }, // ON CONNECT
  8193: { triggerTiming: 'AFTER EVENT', eventType: null }, // ON DISCONNECT
  8194: { triggerTiming: 'BEFORE STATEMENT', eventType: null }, // ON TRANSACTION START
  8195: { triggerTiming: 'AFTER STATEMENT', eventType: null }, // ON TRANSACTION COMMIT
  8196: { triggerTiming: 'AFTER STATEMENT', eventType: null }, // ON TRANSACTION ROLLBACK
};

function getTriggerEventType(triggerType) {
  return eventMap[triggerType]?.eventType || null;
}

function getTriggerCreateSql(triggerResult) {
  const eventType = getTriggerEventType(triggerResult.TRIGGERTYPE);
  const triggerTiming = getTriggerTiming(triggerResult.TRIGGERTYPE);
  const body = triggerResult.TRIGGER_BODY_SQL;

  const createSql = `CREATE OR ALTER TRIGGER "${triggerResult.pureName}" ${triggerTiming} ${eventType} ON "${triggerResult.tableName}" ${body};`;
  return createSql;
}

function getTriggerTiming(triggerType) {
  return eventMap[triggerType]?.triggerTiming || null;
}

function getFormattedDefaultValue(defaultValue) {
  if (defaultValue === null) return null;

  return defaultValue.replace(/^default\s*/i, '');
}
function blobStreamToString(stream, encoding = 'utf8') {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => {
      chunks.push(chunk);
    });
    stream.on('end', () => {
      resolve(Buffer.concat(chunks).toString(encoding));
    });
    stream.on('error', err => {
      reject(err);
    });
  });
}

async function normalizeRow(row) {
  const entries = await Promise.all(
    Object.entries(row).map(async ([key, value]) => {
      if (value === null || value === undefined) return [key, null];
      if (typeof value === 'function') {
        const result = await new Promise((resolve, reject) => {
          value(async (_err, _name, eventEmitter) => {
            try {
              const stringValue = await blobStreamToString(eventEmitter, 'utf8');
              resolve(stringValue);
            } catch (error) {
              reject(error);
            }
          });
        });
        return [key, result];
      }
      return [key, value];
    })
  );
  return Object.fromEntries(entries);
}

function transformRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
        return [key, value.replace('T', ' ')];
      }
      return [key, value];
    })
  );
}

function createFirebirdInsertStream(driver, stream, dbhan, name, options) {
  const writable = createBulkInsertStreamBase(driver, stream, dbhan, name, options);

  writable.addRow = async row => {
    const transformedRow = transformRow(row);

    if (writable.structure) {
      writable.buffer.push(transformedRow);
    } else {
      writable.structure = transformedRow;
      await writable.checkStructure();
    }
  };

  return writable;
}

module.exports = {
  getDataTypeString,
  getTriggerEventType,
  getTriggerTiming,
  getFormattedDefaultValue,
  getTriggerCreateSql,
  blobStreamToString,
  normalizeRow,
  createFirebirdInsertStream,
};
