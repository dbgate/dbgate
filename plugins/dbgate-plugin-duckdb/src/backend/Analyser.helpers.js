/**
 * @typedef {object} DuckDbStringList
 * @property {string[]} items
 */

const extractIndexColumns = require('./extractIndexColumns');

/**
 * @typedef {object} DuckDbColumnRow
 * @property {number | null} numeric_scale
 * @property {number | null} numeric_precision_radix
 * @property {number | null} numeric_precision
 * @property {number | null} character_maximum_length
 * @property {string | null} data_type_id
 * @property {string} data_type
 * @property {boolean} is_nullable
 * @property {string | null} column_default
 * @property {boolean} internal
 * @property {string | null} comment
 * @property {number} column_index
 * @property {string} column_name
 * @property {string} table_oid
 * @property {string} table_name
 * @property {string} schema_oid
 * @property {string} schema_name
 * @property {string} database_oid
 * @property {string} database_name
 */

/**
 * @typedef {object} DuckDbConstraintRow
 * @property {DuckDbStringList} referenced_column_names
 * @property {string | null} referenced_table
 * @property {string | null} constraint_name
 * @property {DuckDbStringList} constraint_column_names
 * @property {DuckDbStringList} constraint_column_indexes
 * @property {string | null} expression
 * @property {string | null} constraint_text
 * @property {string} constraint_type
 * @property {string} constraint_index
 * @property {string} table_oid
 * @property {string} table_name
 * @property {string} schema_oid
 * @property {string} schema_name
 * @property {string} database_oid
 * @property {string} database_name
 */

/**
 * @typedef {object} DuckDbTableRow
 * @property {string | null} sql
 * @property {string} check_constraint_count
 * @property {string} index_count
 * @property {string} column_count
 * @property {string} estimated_size
 * @property {boolean} has_primary_key
 * @property {boolean} temporary
 * @property {boolean} internal
 * @property {{ entries: Array<any> }} tags
 * @property {string | null} comment
 * @property {string} table_oid
 * @property {string} table_name
 * @property {string} schema_oid
 * @property {string} schema_name
 * @property {string} database_oid
 * @property {string} database_name
 */

/**
 * Represents a single row returned from the duckdb_views() function.
 * Note: Assumes OIDs and counts are represented as strings based on previous examples.
 *
 * @typedef {object} DuckDbViewRow
 * @property {string} database_name
 * @property {string} database_oid
 * @property {string} schema_name
 * @property {string} schema_oid
 * @property {string} view_name
 * @property {string} view_oid
 * @property {string | null} comment
 * @property {{ [key: string]: string } | null} tags
 * @property {boolean} internal
 * @property {boolean} temporary
 * @property {string} column_count
 * @property {string | null} sql
 */

/**
 * @param {DuckDbViewRow} duckDbViewRow
 * @returns {import("dbgate-types").ViewInfo}
 */
function mapViewRowToViewInfo(duckDbViewRow) {
  const viewInfo = {
    pureName: duckDbViewRow.view_name,
    schemaName: duckDbViewRow.schema_name,
    objectId: duckDbViewRow.view_oid,
    objectTypeField: 'views',
    columns: [],
  };

  if (duckDbViewRow.comment != null) {
    viewInfo.objectComment = duckDbViewRow.comment;
  }

  if (duckDbViewRow.sql != null) {
    viewInfo.createSql = duckDbViewRow.sql;
  }

  return /** @type {import("dbgate-types").ViewInfo} */ (viewInfo);
}

/**
 * @param {DuckDbTableRow} rawTableData
 */
function mapRawTableToTableInfo(rawTableData) {
  const pureName = rawTableData.table_name;
  const schemaName = rawTableData.schema_name;
  const objectId = rawTableData.table_oid;
  const objectTypeField = 'tables';
  const objectComment = rawTableData.comment;

  return {
    pureName: pureName,
    schemaName: schemaName,
    objectId: objectId,
    objectTypeField: objectTypeField,
    objectComment: objectComment,
  };
}

/**
 * @typedef {object} DuckDbColumnDataTypeInfo
 * @property {string} data_type
 * @property {number | null} numeric_precision
 * @property {number | null} numeric_scale
 * @property {number | null} character_maximum_length
 */

/**
 * @param {DuckDbColumnDataTypeInfo | null | undefined} columnInfo
 * @returns {string}
 */
function extractDataType(columnInfo) {
  const baseType = columnInfo.data_type.toUpperCase();
  const precision = columnInfo.numeric_precision;
  const scale = columnInfo.numeric_scale;
  const maxLength = columnInfo.character_maximum_length;

  switch (baseType) {
    case 'DECIMAL':
    case 'NUMERIC':
      if (typeof precision === 'number' && precision > 0 && typeof scale === 'number' && scale >= 0) {
        return `${baseType}(${precision}, ${scale})`;
      }
      return baseType;

    case 'VARCHAR':
    case 'CHAR':
      if (typeof maxLength === 'number' && maxLength > 0) {
        return `${baseType}(${maxLength})`;
      }
      return baseType;

    default:
      return baseType;
  }
}

/**
 * @param {DuckDbColumnRow} duckDbColumnData
 */
function mapRawColumnToColumnInfo(duckDbColumnData) {
  const columnInfo = {
    pureName: duckDbColumnData.table_name,
    schemaName: duckDbColumnData.schema_name,
    columnName: duckDbColumnData.column_name,
    dataType: extractDataType(duckDbColumnData),
  };

  columnInfo.notNull = !duckDbColumnData.is_nullable;

  if (duckDbColumnData.column_default != null) {
    columnInfo.defaultValue = duckDbColumnData.column_default;
  }

  if (duckDbColumnData.comment != null) {
    columnInfo.columnComment = duckDbColumnData.comment;
  }

  if (duckDbColumnData.numeric_precision != null) {
    columnInfo.precision = duckDbColumnData.numeric_precision;
  }

  if (duckDbColumnData.numeric_scale != null) {
    columnInfo.scale = duckDbColumnData.numeric_scale;
  }

  if (duckDbColumnData.character_maximum_length != null) {
    columnInfo.length = duckDbColumnData.character_maximum_length;
  }

  return columnInfo;
}

/**
 * @param {DuckDbConstraintRow} duckDbConstraintData
 * @returns {import("dbgate-types").ForeignKeyInfo}
 */
function mapConstraintRowToForeignKeyInfo(duckDbConstraintData) {
  if (
    !duckDbConstraintData ||
    duckDbConstraintData.constraint_type !== 'FOREIGN KEY' ||
    duckDbConstraintData.referenced_table == null
  ) {
    return null;
  }

  const columns = [];
  const constraintColumns = duckDbConstraintData.constraint_column_names?.items;
  const referencedColumns = duckDbConstraintData.referenced_column_names?.items;

  for (let i = 0; i < constraintColumns.length; i++) {
    columns.push({
      columnName: constraintColumns[i],
      refColumnName: referencedColumns[i],
    });
  }

  const foreignKeyInfo = {
    pureName: duckDbConstraintData.table_name,
    schemaName: duckDbConstraintData.schema_name,
    constraintType: 'foreignKey',
    columns: columns,
    refTableName: duckDbConstraintData.referenced_table,
    refSchemaName: duckDbConstraintData.schema_name,
  };

  if (duckDbConstraintData.constraint_name != null) {
    foreignKeyInfo.constraintName = duckDbConstraintData.constraint_name;
  }

  return /** @type {import("dbgate-types").ForeignKeyInfo} */ (foreignKeyInfo);
}

/**
 * @param {DuckDbConstraintRow} duckDbConstraintData
 * @returns {import("dbgate-types").PrimaryKeyInfo}
 */
function mapConstraintRowToPrimaryKeyInfo(duckDbConstraintData) {
  const columns = [];
  const constraintColumns = duckDbConstraintData.constraint_column_names?.items;

  for (let i = 0; i < constraintColumns.length; i++) {
    columns.push({
      columnName: constraintColumns[i],
    });
  }

  const primaryKeyInfo = {
    pureName: duckDbConstraintData.table_name,
    schemaName: duckDbConstraintData.schema_name,
    constraintType: 'primaryKey',
    columns: columns,
  };

  if (duckDbConstraintData.constraint_name != null) {
    primaryKeyInfo.constraintName = duckDbConstraintData.constraint_name;
  }

  return /** @type {import("dbgate-types").PrimaryKeyInfo} */ (primaryKeyInfo);
}

/**
 * @typedef {object} DuckDbConstraintRow
 * @property {DuckDbStringList} referenced_column_names
 * @property {string | null} referenced_table
 * @property {string | null} constraint_name
 * @property {DuckDbStringList} constraint_column_names
 * @property {DuckDbStringList} constraint_column_indexes
 * @property {string | null} expression
 * @property {string | null} constraint_text
 * @property {string} constraint_type
 * @property {string} constraint_index
 * @property {string} table_oid
 * @property {string} table_name
 * @property {string} schema_oid
 * @property {string} schema_name
 * @property {string} database_oid
 * @property {string} database_name
 */

/**
 * Maps a single DuckDbConstraintRow object to a UniqueInfo object if it represents a UNIQUE constraint.
 * Assumes UniqueInfo and DuckDbConstraintRow are defined types/interfaces.
 * @param {DuckDbConstraintRow} duckDbConstraintData - A single object conforming to DuckDbConstraintRow.
 * @returns {import("dbgate-types").UniqueInfo | null} An object structured like UniqueInfo, or null if the input is not a valid UNIQUE constraint.
 */
function mapConstraintRowToUniqueInfo(duckDbConstraintData) {
  if (!duckDbConstraintData || duckDbConstraintData.constraint_type !== 'UNIQUE') {
    return null;
  }

  const columns = [];
  const constraintColumns = duckDbConstraintData.constraint_column_names?.items;

  if (Array.isArray(constraintColumns) && constraintColumns.length > 0) {
    for (let i = 0; i < constraintColumns.length; i++) {
      columns.push({
        columnName: constraintColumns[i],
      });
    }
  } else {
    return null;
  }

  const uniqueInfo = {
    pureName: duckDbConstraintData.table_name,
    schemaName: duckDbConstraintData.schema_name,
    constraintType: 'unique',
    columns: columns,
  };

  if (duckDbConstraintData.constraint_name != null) {
    uniqueInfo.constraintName = duckDbConstraintData.constraint_name;
  }

  return /** @type {import("dbgate-types").UniqueInfo} */ (uniqueInfo);
}

/**
 * @typedef {object} DuckDbIndexRow
 * @property {string} database_name
 * @property {string} database_oid
 * @property {string} schema_name
 * @property {string} schema_oid
 * @property {string} index_name
 * @property {string} index_oid
 * @property {string} table_name
 * @property {string} table_oid
 * @property {string | null} comment
 * @property {{ [key: string]: string } | null} tags
 * @property {boolean} is_unique
 * @property {boolean} is_primary
 * @property {string | null} expressions
 * @property {string | null} sql
 */

/**
 * @param {DuckDbIndexRow} duckDbIndexRow
 * @returns {import("dbgate-types").IndexInfo}
 */
function mapIndexRowToIndexInfo(duckDbIndexRow) {
  const indexInfo = {
    pureName: duckDbIndexRow.table_name,
    schemaName: duckDbIndexRow.schema_name,
    constraintType: 'index',
    columns: extractIndexColumns(duckDbIndexRow.sql).map((columnName) => ({ columnName })),
    isUnique: duckDbIndexRow.is_unique,
  };

  if (duckDbIndexRow.index_name != null) {
    indexInfo.constraintName = duckDbIndexRow.index_name;
  }

  return /** @type {import("dbgate-types").IndexInfo} */ (indexInfo);
}

/**
 * @typedef {object} DuckDbSchemaRow
 * @property {string} oid
 * @property {string} database_name
 * @property {string} database_oid
 * @property {string} schema_name
 * @property {string | null} comment
 * @property {{ [key: string]: string } | null} tags
 * @property {boolean} internal
 * @property {string | null} sql
 */

/**
 * @param {DuckDbSchemaRow} duckDbSchemaRow
 * @returns {import("dbgate-types").SchemaInfo}
 */
function mapSchemaRowToSchemaInfo(duckDbSchemaRow) {
  const schemaInfo = {
    schemaName: duckDbSchemaRow.schema_name,
    objectId: duckDbSchemaRow.oid,
  };

  return /** @type {import("dbgate-types").SchemaInfo} */ (schemaInfo);
}

module.exports = {
  mapRawTableToTableInfo,
  mapRawColumnToColumnInfo,
  mapConstraintRowToForeignKeyInfo,
  mapConstraintRowToPrimaryKeyInfo,
  mapConstraintRowToUniqueInfo,
  mapViewRowToViewInfo,
  mapIndexRowToIndexInfo,
  mapSchemaRowToSchemaInfo,
};
