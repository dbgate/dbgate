const _ = require('lodash');
const sql = require('./sql');

const { DatabaseAnalyser, isTypeString, isTypeNumeric, isCompositeDbName, splitCompositeDbName } =
  global.DBGATE_PACKAGES['dbgate-tools'];

function normalizeTypeName(dataType) {
  if (dataType == 'character varying') return 'varchar';
  if (dataType == 'timestamp without time zone') return 'timestamp';
  return dataType;
}

function getColumnInfo(
  { is_nullable, column_name, data_type, char_max_length, numeric_precision, numeric_scale, default_value },
  table = undefined,
  geometryColumns = undefined,
  geographyColumns = undefined
) {
  const normDataType = normalizeTypeName(data_type);
  let fullDataType = normDataType;
  if (char_max_length && isTypeString(normDataType)) fullDataType = `${normDataType}(${char_max_length})`;
  if (numeric_precision && numeric_scale && isTypeNumeric(normDataType))
    fullDataType = `${normDataType}(${numeric_precision},${numeric_scale})`;
  const autoIncrement = !!(default_value && default_value.startsWith('nextval('));
  if (
    table &&
    geometryColumns &&
    geometryColumns.rows.find(
      x => x.schema_name == table.schemaName && x.pure_name == table.pureName && x.column_name == column_name
    )
  ) {
    fullDataType = 'geometry';
  }
  if (
    table &&
    geographyColumns &&
    geographyColumns.rows.find(
      x => x.schema_name == table.schemaName && x.pure_name == table.pureName && x.column_name == column_name
    )
  ) {
    fullDataType = 'geography';
  }
  return {
    columnName: column_name,
    dataType: fullDataType,
    notNull: !is_nullable || is_nullable == 'NO' || is_nullable == 'no',
    defaultValue: autoIncrement ? undefined : default_value,
    autoIncrement,
  };
}

function getParametersSqlString(parameters = []) {
  if (!parameters?.length) return '';

  return parameters
    .map(i => {
      const mode = i.parameterMode ? `${i.parameterMode} ` : '';
      const dataType = i.dataType ? ` ${i.dataType.toUpperCase()}` : '';
      const parameterName = i.parameterName ?? '';
      return `${mode}${parameterName}${dataType}`;
    })
    .join(', ');
}

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver, version) {
    super(dbhan, driver, version);
  }

  createQuery(resFileName, typeFields, replacements = {}) {
    const query = super.createQuery(sql[resFileName], typeFields, {
      ...replacements,
      $typeAggFunc: this.driver.dialect.stringAgg ? 'string_agg' : 'max',
      $typeAggParam: this.driver.dialect.stringAgg ? ", '|'" : '',
      $md5Function: this.dialect?.isFipsComplianceOn ? 'LENGTH' : 'MD5',
    });
    return query;
  }

  async _computeSingleObjectId() {
    const { typeField, schemaName, pureName } = this.singleObjectFilter;
    this.singleObjectId = `${typeField}:${schemaName || 'public'}.${pureName}`;
  }

  async _runAnalysis() {
    const useInfoSchema = this.driver.__analyserInternals.useInfoSchemaRoutines;
    const routinesQueryName = useInfoSchema ? 'routinesInfoSchema' : 'routines';
    const proceduresParametersQueryName = useInfoSchema ? 'proceduresParametersInfoSchema' : 'proceduresParameters';

    // Run all independent queries in parallel
    this.feedback({ analysingMessage: 'DBGM-00241 Loading database structure' });
    const [
      tables,
      views,
      columns,
      pkColumns,
      foreignKeys,
      uniqueNames,
      routines,
      routineParametersRows,
      indexes,
      indexcols,
      matviews,
      matviewColumns,
      triggers,
    ] = await Promise.all([
      this.analyserQuery('tableList', ['tables']),
      this.analyserQuery('views', ['views']),
      this.analyserQuery('columns', ['tables', 'views']),
      this.analyserQuery('primaryKeys', ['tables']),
      this.analyserQuery('foreignKeys', ['tables']),
      this.analyserQuery('uniqueNames', ['tables']),
      this.analyserQuery(routinesQueryName, ['procedures', 'functions']),
      this.analyserQuery(proceduresParametersQueryName),
      this.driver.__analyserInternals.skipIndexes
        ? Promise.resolve({ rows: [] })
        : this.analyserQuery('indexes', ['tables']),
      this.driver.__analyserInternals.skipIndexes
        ? Promise.resolve({ rows: [] })
        : this.analyserQuery('indexcols', ['tables']),
      this.driver.dialect.materializedViews
        ? this.analyserQuery('matviews', ['matviews'])
        : Promise.resolve(null),
      this.driver.dialect.materializedViews
        ? this.analyserQuery('matviewColumns', ['matviews'])
        : Promise.resolve(null),
      this.analyserQuery('triggers'),
    ]);

    // Load geometry/geography columns if the views exist (these are rare, so run after views are loaded)
    let geometryColumns = { rows: [] };
    let geographyColumns = { rows: [] };
    const hasGeometry = views.rows.find(x => x.pure_name == 'geometry_columns' && x.schema_name == 'public');
    const hasGeography = views.rows.find(x => x.pure_name == 'geography_columns' && x.schema_name == 'public');
    if (hasGeometry || hasGeography) {
      const [geomCols, geogCols] = await Promise.all([
        hasGeometry
          ? this.analyserQuery('geometryColumns', ['tables'])
          : Promise.resolve({ rows: [] }),
        hasGeography
          ? this.analyserQuery('geographyColumns', ['tables'])
          : Promise.resolve({ rows: [] }),
      ]);
      geometryColumns = geomCols;
      geographyColumns = geogCols;
    }

    this.feedback({ analysingMessage: 'DBGM-00258 Finalizing DB structure' });

    // Pre-build lookup maps for O(1) access instead of O(n) scanning per table/view
    const columnsByTable = _.groupBy(columns.rows, x => `${x.schema_name}.${x.pure_name}`);
    const indexcolsByOidAttnum = _.keyBy(indexcols.rows, x => `${x.oid}_${x.attnum}`);
    const uniqueNameSet = new Set(uniqueNames.rows.map(x => x.constraint_name));
    const indexesByTable = _.groupBy(indexes.rows, x => `${x.schema_name}.${x.table_name}`);
    const matviewColumnsByTable = matviewColumns
      ? _.groupBy(matviewColumns.rows, x => `${x.schema_name}.${x.pure_name}`)
      : {};

    const columnColumnsMapped = foreignKeys.rows.map(x => ({
      pureName: x.table_name,
      schemaName: x.table_schema,
      constraintName: x.constraint_name,
      columnName: x.column_name,
      refColumnName: x.ref_column_name,
      updateAction: x.update_action,
      deleteAction: x.delete_action,
      refTableName: x.ref_table_name,
      refSchemaName: x.ref_table_schema,
    }));
    const fkByTable = _.groupBy(columnColumnsMapped, x => `${x.schemaName}.${x.pureName}`);

    const pkColumnsMapped = pkColumns.rows.map(x => ({
      pureName: x.pure_name,
      schemaName: x.schema_name,
      constraintSchema: x.constraint_schema,
      constraintName: x.constraint_name,
      columnName: x.column_name,
    }));
    const pkByTable = _.groupBy(pkColumnsMapped, x => `${x.schemaName}.${x.pureName}`);

    const procedureParameters = routineParametersRows.rows
      .filter(i => i.routine_type == 'PROCEDURE')
      .map(i => ({
        pureName: i.pure_name,
        parameterName: i.parameter_name,
        dataType: normalizeTypeName(i.data_type),
        parameterMode: i.parameter_mode,
        schemaName: i.schema_name,
      }));

    const procedureNameToParameters = procedureParameters.reduce((acc, row) => {
      if (!acc[`${row.schemaName}.${row.pureName}`]) acc[`${row.schemaName}.${row.pureName}`] = [];
      acc[`${row.schemaName}.${row.pureName}`].push(row);

      return acc;
    }, {});

    const functionParameters = routineParametersRows.rows
      .filter(i => i.routine_type == 'FUNCTION')
      .map(i => ({
        pureName: i.pure_name,
        parameterName: i.parameter_name,
        dataType: normalizeTypeName(i.data_type),
        parameterMode: i.parameter_mode,
        schemaName: i.schema_name,
      }));

    const functionNameToParameters = functionParameters.reduce((acc, row) => {
      if (!acc[`${row.schemaName}.${row.pureName}`]) acc[`${row.schemaName}.${row.pureName}`] = [];
      acc[`${row.schemaName}.${row.pureName}`].push(row);

      return acc;
    }, {});

    const res = {
      tables: tables.rows.map(table => {
        const tableKey = `${table.schema_name}.${table.pure_name}`;
        const newTable = {
          pureName: table.pure_name,
          schemaName: table.schema_name,
          sizeBytes: table.size_bytes,
          objectId: `tables:${table.schema_name}.${table.pure_name}`,
          contentHash: table.hash_code_columns ? `${table.hash_code_columns}-${table.hash_code_constraints}` : null,
        };
        const tableIndexes = indexesByTable[tableKey] || [];
        return {
          ...newTable,
          columns: (columnsByTable[tableKey] || []).map(col =>
            getColumnInfo(col, newTable, geometryColumns, geographyColumns)
          ),
          primaryKey: DatabaseAnalyser.extractPrimaryKeys(newTable, pkByTable[tableKey] || []),
          foreignKeys: DatabaseAnalyser.extractForeignKeys(newTable, fkByTable[tableKey] || []),
          indexes: tableIndexes
            .filter(x => !uniqueNameSet.has(x.index_name))
            .map(idx => {
              const indOptionSplit = idx.indoption.split(' ');
              return {
                constraintName: idx.index_name,
                isUnique: idx.is_unique,
                columns: _.compact(
                  idx.indkey
                    .split(' ')
                    .map(colid => indexcolsByOidAttnum[`${idx.oid}_${colid}`])
                    .filter(col => col != null)
                    .map((col, colIndex) => ({
                      columnName: col.column_name,
                      isDescending: parseInt(indOptionSplit[colIndex]) > 0,
                    }))
                ),
              };
            }),
          uniques: tableIndexes
            .filter(x => uniqueNameSet.has(x.index_name))
            .map(idx => ({
              constraintName: idx.index_name,
              columns: _.compact(
                idx.indkey
                  .split(' ')
                  .map(colid => indexcolsByOidAttnum[`${idx.oid}_${colid}`])
                  .filter(col => col != null)
                  .map(col => ({
                    columnName: col.column_name,
                  }))
              ),
            })),
        };
      }),
      views: views.rows.map(view => ({
        objectId: `views:${view.schema_name}.${view.pure_name}`,
        pureName: view.pure_name,
        schemaName: view.schema_name,
        contentHash: view.hash_code,
        createSql: `CREATE VIEW "${view.schema_name}"."${view.pure_name}"\nAS\n${view.create_sql}`,
        columns: (columnsByTable[`${view.schema_name}.${view.pure_name}`] || []).map(col => getColumnInfo(col)),
      })),
      matviews: matviews
        ? matviews.rows.map(matview => ({
            objectId: `matviews:${matview.schema_name}.${matview.pure_name}`,
            pureName: matview.pure_name,
            schemaName: matview.schema_name,
            contentHash: matview.hash_code,
            createSql: `CREATE MATERIALIZED VIEW "${matview.schema_name}"."${matview.pure_name}"\nAS\n${matview.definition}`,
            columns: (matviewColumnsByTable[`${matview.schema_name}.${matview.pure_name}`] || [])
              .map(col => getColumnInfo(col)),
          }))
        : undefined,
      procedures: routines.rows
        .filter(x => x.object_type == 'PROCEDURE')
        .map(proc => ({
          objectId: `procedures:${proc.schema_name}.${proc.pure_name}`,
          pureName: proc.pure_name,
          schemaName: proc.schema_name,
          createSql: `CREATE PROCEDURE "${proc.schema_name}"."${proc.pure_name}"(${getParametersSqlString(
            procedureNameToParameters[`${proc.schema_name}.${proc.pure_name}`]
          )}) LANGUAGE ${proc.language}\nAS\n$$\n${proc.definition}\n$$`,
          contentHash: proc.hash_code,
          parameters: procedureNameToParameters[`${proc.schema_name}.${proc.pure_name}`],
        })),
      functions: routines.rows
        .filter(x => x.object_type == 'FUNCTION')
        .map(func => ({
          objectId: `functions:${func.schema_name}.${func.pure_name}`,
          createSql: `CREATE FUNCTION "${func.schema_name}"."${func.pure_name}"(${getParametersSqlString(
            functionNameToParameters[`${func.schema_name}.${func.pure_name}`]
          )}) RETURNS ${func.data_type.toUpperCase()} LANGUAGE ${func.language}\nAS\n$$\n${func.definition}\n$$`,
          pureName: func.pure_name,
          schemaName: func.schema_name,
          contentHash: func.hash_code,
          parameters: functionNameToParameters[`${func.schema_name}.${func.pure_name}`],
          returnType: func.data_type,
        })),
      triggers: triggers.rows.map(row => ({
        pureName: row.trigger_name,
        trigerName: row.trigger_name,
        functionName: row.function_name,
        triggerTiming: row.trigger_timing,
        triggerLevel: row.trigger_level,
        eventType: row.event_type,
        schemaName: row.schema_name,
        tableName: row.table_name,
        createSql: row.definition,
        contentHash: `triggers:${row.trigger_id}`,
        objectId: `triggers:${row.trigger_id}`,
      })),
    };

    this.feedback({ analysingMessage: null });

    this.logger.debug(
      {
        ...this.getLogDbInfo(),
        tables: res.tables?.length,
        columns: _.sum(res.tables?.map(x => x.columns?.length)),
        primaryKeys: res.tables?.filter(x => x.primaryKey)?.length,
        foreignKeys: _.sum(res.tables?.map(x => x.foreignKeys?.length)),
        indexes: _.sum(res.tables?.map(x => x.indexes?.length)),
        uniques: _.sum(res.tables?.map(x => x.uniques?.length)),
        views: res.views?.length,
        matviews: res.matviews?.length,
        procedures: res.procedures?.length,
        functions: res.functions?.length,
      },
      'DBGM-00141 Database structured finalized'
    );

    return res;
  }

  async _getFastSnapshot() {
    const useInfoSchema = this.driver.__analyserInternals.useInfoSchemaRoutines;
    const routineModificationsQueryName = useInfoSchema ? 'routineModificationsInfoSchema' : 'routineModifications';

    // Run all modification queries in parallel
    const [
      tableModificationsQueryData,
      viewModificationsQueryData,
      matviewModificationsQueryData,
      routineModificationsQueryData,
    ] = await Promise.all([
      this.analyserQuery('tableModifications'),
      this.analyserQuery('viewModifications'),
      this.driver.dialect.materializedViews
        ? this.analyserQuery('matviewModifications')
        : Promise.resolve(null),
      this.analyserQuery(routineModificationsQueryName),
    ]);

    return {
      tables: tableModificationsQueryData.rows.map(x => ({
        objectId: `tables:${x.schema_name}.${x.pure_name}`,
        pureName: x.pure_name,
        schemaName: x.schema_name,
        contentHash: `${x.hash_code_columns}-${x.hash_code_constraints}`,
      })),
      views: viewModificationsQueryData.rows.map(x => ({
        objectId: `views:${x.schema_name}.${x.pure_name}`,
        pureName: x.pure_name,
        schemaName: x.schema_name,
        contentHash: x.hash_code,
      })),
      matviews: matviewModificationsQueryData
        ? matviewModificationsQueryData.rows.map(x => ({
            objectId: `matviews:${x.schema_name}.${x.pure_name}`,
            pureName: x.pure_name,
            schemaName: x.schema_name,
            contentHash: x.hash_code,
          }))
        : undefined,
      procedures: routineModificationsQueryData.rows
        .filter(x => x.object_type == 'PROCEDURE')
        .map(x => ({
          objectId: `procedures:${x.schema_name}.${x.pure_name}`,
          pureName: x.pure_name,
          schemaName: x.schema_name,
          contentHash: x.hash_code,
        })),
      functions: routineModificationsQueryData.rows
        .filter(x => x.object_type == 'FUNCTION')
        .map(x => ({
          objectId: `functions:${x.schema_name}.${x.pure_name}`,
          pureName: x.pure_name,
          schemaName: x.schema_name,
          contentHash: x.hash_code,
        })),
    };
  }

  getDefaultSchemaNameCondition() {
    return `not in ('pg_catalog', 'pg_toast', 'information_schema')`;
  }
}

module.exports = Analyser;
