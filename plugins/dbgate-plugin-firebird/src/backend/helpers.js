function getDataTypeString(column) {
  if (!column) {
    return null;
  }
  const { DATATYPECODE, SCALE, LENGTH, NUMBERPRECISION } = column;

  switch (DATATYPECODE) {
    case 7:
      return 'SMALLINT';

    case 8:
      return 'INTEGER';

    case 9:
      return 'BIGINT';

    case 10:
      return 'FLOAT';

    case 11:
      return 'DOUBLE PRECISION';

    case 12:
      return 'DATE';

    case 13:
      return 'TIME';

    case 14:
      return `CHAR(${LENGTH})`;

    case 16:
      return `DECIMAL(${NUMBERPRECISION}, ${SCALE})`;

    case 27:
      return 'DOUBLE PRECISION';

    case 35:
      return 'BLOB';

    case 37:
      return `VARCHAR(${LENGTH})`;

    case 261:
      return 'CSTRING';

    default:
      return `UNKNOWN (${DATATYPECODE})`;
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

function getTriggerTiming(triggerType) {
  return eventMap[triggerType]?.triggerTiming || null;
}

module.exports = {
  getDataTypeString,
  getTriggerEventType,
  getTriggerTiming,
};
