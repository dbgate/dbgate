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
  { is_nullable, column_name, data_type, char_max_length, numeric_precision, numeric_ccale, default_value },
  table = undefined,
  geometryColumns = undefined,
  geographyColumns = undefined
) {
  const normDataType = normalizeTypeName(data_type);
  let fullDataType = normDataType;
  if (char_max_length && isTypeString(normDataType)) fullDataType = `${normDataType}(${char_max_length})`;
  if (numeric_precision && numeric_ccale && isTypeNumeric(normDataType))
    fullDataType = `${normDataType}(${numeric_precision},${numeric_ccale})`;
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
    this.feedback({ analysingMessage: 'Loading tables' });
    const tables = await this.analyserQuery(this.driver.dialect.stringAgg ? 'tableModifications' : 'tableList', [
      'tables',
    ]);

    this.feedback({ analysingMessage: 'Loading columns' });
    const columns = await this.analyserQuery('columns', ['tables', 'views']);

    this.feedback({ analysingMessage: 'Loading primary keys' });
    const pkColumns = await this.analyserQuery('primaryKeys', ['tables']);

    let fkColumns = null;

    this.feedback({ analysingMessage: 'Loading foreign key constraints' });
    // const fk_tableConstraints = await this.analyserQuery('fk_tableConstraints', ['tables']);

    this.feedback({ analysingMessage: 'Loading foreign key refs' });
    const foreignKeys = await this.analyserQuery('foreignKeys', ['tables']);

    this.feedback({ analysingMessage: 'Loading foreign key columns' });
    const fk_keyColumnUsage = await this.analyserQuery('fk_keyColumnUsage', ['tables']);

    // const cntKey = x => `${x.constraint_name}|${x.constraint_schema}`;
    const fkRows = [];
    // const fkConstraintDct = _.keyBy(fk_tableConstraints.rows, cntKey);
    for (const fkRef of foreignKeys.rows) {
      // const cntBase = fkConstraintDct[cntKey(fkRef)];
      // const cntRef = fkConstraintDct[`${fkRef.unique_constraint_name}|${fkRef.unique_constraint_schema}`];
      // if (!cntBase || !cntRef) continue;
      const baseCols = _.sortBy(
        fk_keyColumnUsage.rows.filter(
          x =>
            x.table_name == fkRef.table_name &&
            x.constraint_name == fkRef.constraint_name &&
            x.table_schema == fkRef.table_schema
        ),
        'ordinal_position'
      );
      const refCols = _.sortBy(
        fk_keyColumnUsage.rows.filter(
          x =>
            x.table_name == fkRef.ref_table_name &&
            x.constraint_name == fkRef.unique_constraint_name &&
            x.table_schema == fkRef.ref_table_schema
        ),
        'ordinal_position'
      );
      if (baseCols.length != refCols.length) continue;

      for (let i = 0; i < baseCols.length; i++) {
        const baseCol = baseCols[i];
        const refCol = refCols[i];

        fkRows.push({
          ...fkRef,
          pure_name: fkRef.table_name,
          schema_name: fkRef.table_schema,
          ref_table_name: fkRef.ref_table_name,
          ref_schema_name: fkRef.ref_table_schema,
          column_name: baseCol.column_name,
          ref_column_name: refCol.column_name,
        });
      }
    }
    fkColumns = { rows: fkRows };

    this.feedback({ analysingMessage: 'Loading views' });
    const views = await this.analyserQuery('views', ['views']);

    this.feedback({ analysingMessage: 'Loading materialized views' });
    const matviews = this.driver.dialect.materializedViews ? await this.analyserQuery('matviews', ['matviews']) : null;

    this.feedback({ analysingMessage: 'Loading materialized view columns' });
    const matviewColumns = this.driver.dialect.materializedViews
      ? await this.analyserQuery('matviewColumns', ['matviews'])
      : null;

    this.feedback({ analysingMessage: 'Loading routines' });
    const routines = await this.analyserQuery('routines', ['procedures', 'functions']);

    this.feedback({ analysingMessage: 'Loading routine parameters' });
    const routineParametersRows = await this.analyserQuery('proceduresParameters');

    this.feedback({ analysingMessage: 'Loading indexes' });
    const indexes = this.driver.__analyserInternals.skipIndexes
      ? { rows: [] }
      : await this.analyserQuery('indexes', ['tables']);

    this.feedback({ analysingMessage: 'Loading index columns' });
    const indexcols = this.driver.__analyserInternals.skipIndexes
      ? { rows: [] }
      : await this.analyserQuery('indexcols', ['tables']);

    this.feedback({ analysingMessage: 'Loading unique names' });
    const uniqueNames = await this.analyserQuery('uniqueNames', ['tables']);

    let geometryColumns = { rows: [] };
    if (views.rows.find(x => x.pure_name == 'geometry_columns' && x.schema_name == 'public')) {
      this.feedback({ analysingMessage: 'Loading geometry columns' });
      geometryColumns = await this.analyserQuery('geometryColumns', ['tables']);
    }

    let geographyColumns = { rows: [] };
    if (views.rows.find(x => x.pure_name == 'geography_columns' && x.schema_name == 'public')) {
      this.feedback({ analysingMessage: 'Loading geography columns' });
      geographyColumns = await this.analyserQuery('geographyColumns', ['tables']);
    }

    this.feedback({ analysingMessage: 'Loading triggers' });
    const triggers = await this.analyserQuery('triggers');

    this.feedback({ analysingMessage: 'Finalizing DB structure' });

    const columnColumnsMapped = fkColumns.rows.map(x => ({
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
    }));
    const pkColumnsMapped = pkColumns.rows.map(x => ({
      pureName: x.pure_name,
      schemaName: x.schema_name,
      constraintSchema: x.constraint_schema,
      constraintName: x.constraint_name,
      columnName: x.column_name,
    }));

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
            .map(col => getColumnInfo(col, newTable, geometryColumns, geographyColumns)),
          primaryKey: DatabaseAnalyser.extractPrimaryKeys(newTable, pkColumnsMapped),
          foreignKeys: DatabaseAnalyser.extractForeignKeys(newTable, columnColumnsMapped),
          indexes: indexes.rows
            .filter(
              x =>
                x.table_name == table.pure_name &&
                x.schema_name == table.schema_name &&
                !uniqueNames.rows.find(y => y.constraint_name == x.index_name)
            )
            .map(idx => {
              const indOptionSplit = idx.indoption.split(' ');
              return {
                constraintName: idx.index_name,
                isUnique: idx.is_unique,
                columns: _.compact(
                  idx.indkey
                    .split(' ')
                    .map(colid => indexcols.rows.find(col => col.oid == idx.oid && col.attnum == colid))
                    .filter(col => col != null)
                    .map((col, colIndex) => ({
                      columnName: col.column_name,
                      isDescending: parseInt(indOptionSplit[colIndex]) > 0,
                    }))
                ),
              };
            }),
          uniques: indexes.rows
            .filter(
              x =>
                x.table_name == table.pure_name &&
                x.schema_name == table.schema_name &&
                uniqueNames.rows.find(y => y.constraint_name == x.index_name)
            )
            .map(idx => ({
              constraintName: idx.index_name,
              columns: _.compact(
                idx.indkey
                  .split(' ')
                  .map(colid => indexcols.rows.find(col => col.oid == idx.oid && col.attnum == colid))
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
        columns: columns.rows
          .filter(col => col.pure_name == view.pure_name && col.schema_name == view.schema_name)
          .map(col => getColumnInfo(col)),
      })),
      matviews: matviews
        ? matviews.rows.map(matview => ({
            objectId: `matviews:${matview.schema_name}.${matview.pure_name}`,
            pureName: matview.pure_name,
            schemaName: matview.schema_name,
            contentHash: matview.hash_code,
            createSql: `CREATE MATERIALIZED VIEW "${matview.schema_name}"."${matview.pure_name}"\nAS\n${matview.definition}`,
            columns: matviewColumns.rows
              .filter(col => col.pure_name == matview.pure_name && col.schema_name == matview.schema_name)
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
      'Database structured finalized'
    );

    return res;
  }

  async _getFastSnapshot() {
    const tableModificationsQueryData = this.driver.dialect.stringAgg
      ? await this.analyserQuery('tableModifications')
      : null;
    const viewModificationsQueryData = await this.analyserQuery('viewModifications');
    const matviewModificationsQueryData = this.driver.dialect.materializedViews
      ? await this.analyserQuery('matviewModifications')
      : null;
    const routineModificationsQueryData = await this.analyserQuery('routineModifications');

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
