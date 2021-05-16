const fp = require('lodash/fp');
const _ = require('lodash');
const sql = require('./sql');

const { DatabaseAnalyser } = require('dbgate-tools');
const { isTypeString, isTypeNumeric } = require('dbgate-tools');

function normalizeTypeName(dataType) {
  if (dataType == 'character varying') return 'varchar';
  if (dataType == 'timestamp without time zone') return 'timestamp';
  return dataType;
}

function getColumnInfo({
  is_nullable,
  column_name,
  data_type,
  char_max_length,
  numeric_precision,
  numeric_ccale,
  default_value,
}) {
  const normDataType = normalizeTypeName(data_type);
  let fullDataType = normDataType;
  if (char_max_length && isTypeString(normDataType)) fullDataType = `${normDataType}(${char_max_length})`;
  if (numeric_precision && numeric_ccale && isTypeNumeric(normDataType))
    fullDataType = `${normDataType}(${numeric_precision},${numeric_ccale})`;
  return {
    columnName: column_name,
    dataType: fullDataType,
    notNull: !is_nullable || is_nullable == 'NO' || is_nullable == 'no',
    defaultValue: default_value,
  };
}

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  createQuery(resFileName, typeFields) {
    return super.createQuery(sql[resFileName], typeFields);
  }

  async _computeSingleObjectId() {
    const { typeField, schemaName, pureName } = this.singleObjectFilter;
    this.singleObjectId = `${typeField}:${schemaName || 'public'}.${pureName}`;
  }

  async _runAnalysis() {
    const tables = await this.driver.query(
      this.pool,
      this.createQuery(this.driver.dialect.stringAgg ? 'tableModifications' : 'tableList', ['tables'])
    );
    const columns = await this.driver.query(this.pool, this.createQuery('columns', ['tables']));
    const pkColumns = await this.driver.query(this.pool, this.createQuery('primaryKeys', ['tables']));
    const fkColumns = await this.driver.query(this.pool, this.createQuery('foreignKeys', ['tables']));
    const views = await this.driver.query(this.pool, this.createQuery('views', ['views']));
    const routines = await this.driver.query(this.pool, this.createQuery('routines', ['procedures', 'functions']));

    return {
      tables: tables.rows.map(table => {
        const newTable = {
          pureName: table.pure_name,
          schemaName: table.schema_name,
          objectId: `tables:${table.schema_name}.${table.pure_name}`,
          contentHash: table.hash_code_columns ? `${table.hash_code_columns}-${table.hash_code_constraints}` : null,
        };
        return {
          ...newTable,
          columns: columns.rows
            .filter(col => col.pure_name == table.pure_name && col.schema_name == table.schema_name)
            .map(getColumnInfo),
          primaryKey: DatabaseAnalyser.extractPrimaryKeys(
            newTable,
            pkColumns.rows.map(x => ({
              pureName: x.pure_name,
              schemaName: x.schema_name,
              constraintSchema: x.constraint_schema,
              constraintName: x.constraint_name,
              columnName: x.column_name,
            }))
          ),
          foreignKeys: DatabaseAnalyser.extractForeignKeys(
            newTable,
            fkColumns.rows.map(x => ({
              pureName: x.pure_name,
              schemaName: x.schema_name,
              constraintSchema: x.constraint_schema,
              constraintName: x.constraint_name,
              columnName: x.column_name,
              refColumnName: x.ref_column_name,
              updateAction: x.update_action,
              deleteAction: x.delete_action,
              refTableName: x.ref_table_name,
              refSchemaName: x.ref_schema_name,
            }))
          ),
        };
      }),
      views: views.rows.map(view => ({
        objectId: `views:${view.schema_name}.${view.pure_name}`,
        pureName: view.pure_name,
        schemaName: view.schema_name,
        contentHash: view.hash_code,
        columns: columns.rows
          .filter(col => col.pure_name == view.pure_name && col.schema_name == view.schema_name)
          .map(getColumnInfo),
      })),
      procedures: routines.rows
        .filter(x => x.objectType == 'PROCEDURE')
        .map(proc => ({
          objectId: `procedures:${proc.schema_name}.${proc.pure_name}`,
          pureName: proc.pure_name,
          schemaName: proc.schema_name,
          contentHash: proc.hash_code,
        })),
      functions: routines.rows
        .filter(x => x.objectType == 'FUNCTION')
        .map(func => ({
          objectId: `functions:${func.schema_name}.${func.pure_name}`,
          pureName: func.pure_name,
          schemaName: func.schema_name,
          contentHash: func.hash_code,
        })),
    };
  }

  async _getFastSnapshot() {
    const tableModificationsQueryData = this.driver.dialect.stringAgg
      ? await this.driver.query(this.pool, this.createQuery('tableModifications'))
      : null;
    const viewModificationsQueryData = await this.driver.query(this.pool, this.createQuery('viewModifications'));
    const routineModificationsQueryData = await this.driver.query(this.pool, this.createQuery('routineModifications'));

    return {
      tables: tableModificationsQueryData
        ? tableModificationsQueryData.rows.map(x => ({
            objectId: `tables:${x.schema_name}.${x.pure_name}`,
            pureName: x.pure_name,
            schemaName: x.schema_name,
            contentHash: `${x.hash_code_columns}-${x.hash_code_constraints}`,
          }))
        : null,
      views: viewModificationsQueryData.rows.map(x => ({
        objectId: `views:${x.schema_name}.${x.pure_name}`,
        pureName: x.pure_name,
        schemaName: x.schema_name,
        contentHash: x.hash_code,
      })),
      procedures: routineModificationsQueryData.rows
        .filter(x => x.objectType == 'PROCEDURE')
        .map(x => ({
          objectId: `procedures:${x.schema_name}.${x.pure_name}`,
          pureName: x.pure_name,
          schemaName: x.schema_name,
          contentHash: x.hash_code,
        })),
      functions: routineModificationsQueryData.rows
        .filter(x => x.objectType == 'FUNCTION')
        .map(x => ({
          objectId: `functions:${x.schema_name}.${x.pure_name}`,
          pureName: x.pure_name,
          schemaName: x.schema_name,
          contentHash: x.hash_code,
        })),
    };
  }
}

module.exports = Analyser;
