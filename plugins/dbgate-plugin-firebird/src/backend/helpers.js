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

module.exports = {
  getDataTypeString,
};
