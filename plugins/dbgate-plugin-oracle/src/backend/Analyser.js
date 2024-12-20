const _ = require('lodash');
const sql = require('./sql');

const { DatabaseAnalyser, isTypeString, isTypeNumeric } = global.DBGATE_PACKAGES['dbgate-tools'];

function normalizeTypeName(dataType) {
  if (dataType == 'character varying') return 'varchar';
  if (dataType == 'timestamp without time zone') return 'timestamp';
  return dataType;
}

function getColumnInfo(
  { is_nullable, column_name, data_type, char_max_length, numeric_precision, numeric_ccale, default_value },
  table = undefined
) {
  const normDataType = normalizeTypeName(data_type);
  let fullDataType = normDataType;
  if (char_max_length && isTypeString(normDataType)) fullDataType = `${normDataType}(${char_max_length})`;
  if (numeric_precision && numeric_ccale && isTypeNumeric(normDataType))
    fullDataType = `${normDataType}(${numeric_precision},${numeric_ccale})`;
  const autoIncrement = !!(default_value && default_value.endsWith('.nextval'));
  return {
    columnName: column_name,
    dataType: fullDataType,
    notNull: is_nullable == 'N',
    defaultValue: autoIncrement ? undefined : default_value?.trim(),
    autoIncrement,
  };
}

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver, version) {
    super(dbhan, driver, version);
  }

  createQuery(resFileName, typeFields, replacements = {}) {
    const query = super.createQuery(sql[resFileName], typeFields, replacements);
    //if (query) return query.replace('#REFTABLECOND#', this.driver.__analyserInternals.refTableCond);
    return query;
  }

  async _computeSingleObjectId() {
    const { typeField, pureName } = this.singleObjectFilter;
    this.singleObjectId = `${typeField}:${pureName}`;
  }

  async _runAnalysis() {
    this.feedback({ analysingMessage: 'Loading tables' });
    const tables = await this.analyserQuery('tableList', ['tables'], { $owner: this.dbhan.database });
    this.feedback({ analysingMessage: 'Loading columns' });
    const columns = await this.analyserQuery('columns', ['tables', 'views'], { $owner: this.dbhan.database });

    this.feedback({ analysingMessage: 'Loading primary keys' });
    const pkColumns = await this.analyserQuery('primaryKeys', ['tables'], { $owner: this.dbhan.database });

    //let fkColumns = null;

    this.feedback({ analysingMessage: 'Loading foreign keys' });
    const fkColumns = await this.analyserQuery('foreignKeys', ['tables'], { $owner: this.dbhan.database });
    this.feedback({ analysingMessage: 'Loading views' });
    const views = await this.analyserQuery('views', ['views'], { $owner: this.dbhan.database });

    this.feedback({ analysingMessage: 'Loading materialized views' });
    const matviews = this.driver.dialect.materializedViews
      ? await this.analyserQuery('matviews', ['matviews'], { $owner: this.dbhan.database })
      : null;
    this.feedback({ analysingMessage: 'Loading routines' });
    const routines = await this.analyserQuery('routines', ['procedures', 'functions'], {
      $owner: this.dbhan.database,
    });

    const parameters = await this.analyserQuery('parameters', ['procedures', 'functions'], {
      $owner: this.dbhan.database,
    });
    console.dir(parameters, { depth: 4 });

    const routineToParams = parameters.rows.reduce((acc, row) => {
      if (!acc[row.PURE_NAME]) acc[row.PURE_NAME] = [];

      acc[row.PURE_NAME].push({
        pureName: row.PURE_NAME,
        parameterName: row.PARAMETER_NAME,
        dataType: row.DATA_TYPE,
        charMaxLength: row.CHAR_MAX,
        numericPrecision: row.NUMERIC_PRECISION,
        numericScale: row.NUMERIC_SCALE,
        parameterMode: row.PARAMETER_MODE,
        position: row.ORDINAL_POSITION ?? acc[row.PURE_NAME].length,
      });

      return acc;
    }, {});

    this.feedback({ analysingMessage: 'Loading indexes' });
    const indexes = await this.analyserQuery('indexes', ['tables'], { $owner: this.dbhan.database });
    this.feedback({ analysingMessage: 'Loading unique names' });

    const triggers = await this.analyserQuery('triggers', undefined, { $owner: this.dbhan.database });
    this.feedback({ analysingMessage: 'Loading triggers' });

    const uniqueNames = await this.analyserQuery('uniqueNames', ['tables'], { $owner: this.dbhan.database });
    this.feedback({ analysingMessage: 'Finalizing DB structure' });

    const fkColumnsMapped = fkColumns.rows.map(x => ({
      pureName: x.pure_name,
      // schemaName: x.schema_name,
      constraintSchema: x.constraint_schema,
      constraintName: x.constraint_name,
      columnName: x.column_name,
      refColumnName: x.ref_column_name,
      updateAction: x.update_action,
      deleteAction: x.delete_action,
      refTableName: x.ref_table_name,
      // refSchemaName: x.ref_schema_name,
    }));
    const pkColumnsMapped = pkColumns.rows.map(x => ({
      pureName: x.pure_name,
      // schemaName: x.schema_name,
      constraintSchema: x.constraint_schema,
      constraintName: x.constraint_name,
      columnName: x.column_name,
    }));

    const columnGroup = col => `${col.schema_name}||${col.pure_name}`;
    const columnsGrouped = _.groupBy(columns.rows, columnGroup);

    const res = {
      tables: tables.rows.map(table => {
        const newTable = {
          pureName: table.pure_name,
          // schemaName: table.schema_name,
          objectId: `tables:${table.pure_name}`,
          contentHash: table.hash_code_columns ? `${table.hash_code_columns}-${table.hash_code_constraints}` : null,
        };
        return {
          ...newTable,
          columns: (columnsGrouped[columnGroup(table)] || []).map(col => getColumnInfo(col, newTable)),
          primaryKey: DatabaseAnalyser.extractPrimaryKeys(newTable, pkColumnsMapped),
          foreignKeys: DatabaseAnalyser.extractForeignKeys(newTable, fkColumnsMapped),
          indexes: _.uniqBy(
            indexes.rows.filter(
              idx =>
                idx.tableName == newTable.pureName &&
                !uniqueNames.rows.find(x => x.constraintName == idx.constraintName) &&
                !idx.constraintName.startsWith('SYS_C')
            ),
            'constraintName'
          ).map(idx => ({
            ..._.pick(idx, ['constraintName', 'indexType']),
            isUnique: idx.Unique === 'UNIQUE',
            columns: indexes.rows
              .filter(col => col.tableName == idx.tableName && col.constraintName == idx.constraintName)
              .map(col => ({
                ..._.pick(col, ['columnName']),
                isDescending: col.descending == 'DESC',
              })),
          })),
          uniques: _.uniqBy(
            indexes.rows.filter(
              idx =>
                idx.tableName == newTable.pureName && uniqueNames.rows.find(x => x.constraintName == idx.constraintName)
            ),
            'constraintName'
          ).map(idx => ({
            ..._.pick(idx, ['constraintName']),
            columns: indexes.rows
              .filter(col => col.tableName == idx.tableName && col.constraintName == idx.constraintName)
              .map(col => ({
                ..._.pick(col, ['columnName']),
              })),
          })),
          identitySequenceName: (columnsGrouped[columnGroup(table)] || [])
            .find(x => x?.default_value?.endsWith('.nextval'))
            ?.default_value?.match(/\"([^"]+)\"\.nextval/)?.[1],
        };
      }),
      views: views.rows.map(view => ({
        objectId: `views:${view.pure_name}`,
        pureName: view.pure_name,
        // schemaName: view.schema_name,
        contentHash: view.hash_code,
        createSql: `CREATE VIEW "${view.pure_name}"\nAS\n${view.create_sql}`,
        columns: (columnsGrouped[columnGroup(view)] || []).map(col => getColumnInfo(col)),
      })),
      matviews: matviews
        ? matviews.rows.map(matview => ({
            objectId: `matviews:${matview.pure_name}`,
            pureName: matview.pure_name,
            // schemaName: matview.schema_name,
            contentHash: matview.hash_code,
            createSql: `CREATE MATERIALIZED VIEW "${matview.pure_name}"\nAS\n${matview.definition}`,
            columns: (columnsGrouped[columnGroup(view)] || []).map(col => getColumnInfo(col)),
          }))
        : undefined,
      procedures: routines.rows
        .filter(x => x.object_type == 'PROCEDURE')
        .map(proc => ({
          objectId: `procedures:${proc.pure_name}`,
          pureName: proc.pure_name,
          // schemaName: proc.schema_name,
          createSql: `SET SQLTERMINATOR "/"\nCREATE ${proc.source_code}\n/\n`,
          contentHash: proc.hash_code,
          parameters: routineToParams[proc.pure_name],
        })),
      functions: routines.rows
        .filter(x => x.object_type == 'FUNCTION')
        .map(func => ({
          objectId: `functions:${func.pure_name}`,
          createSql: `SET SQLTERMINATOR "/"\nCREATE ${func.source_code}\n/\n`,
          pureName: func.pure_name,
          // schemaName: func.schema_name,
          contentHash: func.hash_code,
          parameters: routineToParams[func.pure_name],
        })),
      triggers: triggers.rows.map(row => ({
        pureName: row.trigger_name,
        createSql: `SET SQLTERMINATOR "/"\nCREATE TRIGGER "${row.trigger_name}" ${
          row.trigger_timing.includes('BEFORE') ? 'BEFORE' : 'AFTER'
        } ${row.event_type} ON "${row.table_name}" FOR EACH ROW ${row.definition} \n/\n`,
        // createSql: `SET SQLTERMINATOR "/"\n${row.definition}\n/\n`,
        tableName: row.table_name,
        triggerLevel: row.trigger_level,
        triggerTiming: row.trigger_timing,
        eventType: row.event_type,
      })),
    };

    this.feedback({ analysingMessage: null });

    return res;
  }
}

module.exports = Analyser;
