/**
 * @typedef {object} DuckDbStringList
 * @property {string[]} items
 */

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
 * @param {DuckDbTableRow} rawTableData
 */
function mapRawTableToTableInfo(rawTableData) {
  const pureName = rawTableData.table_name;
  const schemaName = rawTableData.schema_name;
  const objectId = rawTableData.table_oid;
  const objectTypeField = 'table';
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
 * @param {DuckDbColumnRow} duckDbColumnData
 */
function mapRawColumnToColumnInfo(duckDbColumnData) {
  const columnInfo = {
    pureName: duckDbColumnData.table_name,
    schemaName: duckDbColumnData.schema_name,
    columnName: duckDbColumnData.column_name,
    dataType: duckDbColumnData.data_type,
    displayedDataType: duckDbColumnData.data_type,
  };

  if (duckDbColumnData.is_nullable === false) {
    columnInfo.notNull = true;
  }

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
 * @returns {import("dbgate-types").ForeignKeyInfo | null}
 */
function mapDuckDbFkConstraintToForeignKeyInfo(duckDbConstraintData) {
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

  if (
    Array.isArray(constraintColumns) &&
    Array.isArray(referencedColumns) &&
    constraintColumns.length > 0 &&
    constraintColumns.length === referencedColumns.length
  ) {
    for (let i = 0; i < constraintColumns.length; i++) {
      columns.push({
        columnName: constraintColumns[i],
        refColumnName: referencedColumns[i],
      });
    }
  } else {
    return null;
  }

  const foreignKeyInfo = {
    pureName: duckDbConstraintData.table_name,
    schemaName: duckDbConstraintData.schema_name,
    constraintType: 'foreignKey',
    columns: columns,
    refTableName: duckDbConstraintData.referenced_table,
  };

  if (duckDbConstraintData.constraint_name != null) {
    foreignKeyInfo.constraintName = duckDbConstraintData.constraint_name;
  }

  return /** @type {import("dbgate-types").ForeignKeyInfo} */ (foreignKeyInfo);
}

module.exports = {
  mapRawTableToTableInfo,
  mapRawColumnToColumnInfo,
  mapDuckDbFkConstraintToForeignKeyInfo,
};
