const _ = require('lodash');
const sql = require('./sql');

const { DatabaseAnalyser, isTypeString, isTypeNumeric } = global.DBGATE_PACKAGES['dbgate-tools'];

function quoteDefaultValue(value, extra) {
  if (value == null) return value;
  // MySQL reports expression defaults as SQL rather than string literals.
  if (/(^|\s)DEFAULT_GENERATED(\s|$)/i.test(extra || '')) return `(${value})`;
  if (!isNaN(value) && !isNaN(parseFloat(value))) return value;
  if (_.isString(value) && value.startsWith('CURRENT_')) return value;
  // keep NULL as default value. Is this really necessary?
  if (_.isString(value) && value?.toUpperCase() == 'NULL') return 'NULL';
  if (_.isString(value)) {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  return value;
}

function normalizeTypeName(typeName) {
  if (/int\(\d+\)/.test(typeName)) return 'int';
  return typeName;
}

function extractOnUpdateExpression(extra) {
  if (!_.isString(extra)) return undefined;
  const match = extra.match(/(?:^|\s)on update\s+(.+)$/i);
  return match ? match[1].trim() : undefined;
}

// types, where DATA_TYPE + length/precision is not enough to reproduce column type (eg. datetime(6), decimal(12,0), bit(8))
const TYPES_WITH_FULL_COLUMN_TYPE = ['decimal', 'numeric', 'float', 'double', 'real', 'bit', 'datetime', 'timestamp', 'time'];

function getFullColumnType(columnType) {
  // unsigned and zerofill are stored in separate properties
  return columnType
    .split(' ')
    .filter(x => x && !['unsigned', 'zerofill'].includes(x.toLowerCase()))
    .join(' ');
}

function normalizeGenerationExpression(expression) {
  if (!_.isString(expression) || !expression.trim()) return undefined;
  // MySQL 8 returns quotes in GENERATION_EXPRESSION escaped (eg. concat(`a`,_utf8mb4\'x\'))
  if (expression.includes("\\'") && !/(^|[^\\])'/.test(expression)) {
    return expression.replace(/\\(['\\])/g, '$1');
  }
  return expression;
}

function getGeneratedColumnInfo(extra, generationExpression) {
  const match = _.isString(extra) && extra.match(/(?:^|\s)(virtual|stored|persistent) generated(?:\s|$)/i);
  const expression = normalizeGenerationExpression(generationExpression);
  if (!match || !expression) return {};
  return {
    generationExpression: expression,
    isStoredGenerated: match[1].toLowerCase() != 'virtual',
  };
}

// SRS_ID column exists since MySQL 8.0.3, it is not in MariaDB
function supportsSrid(version) {
  if (!version?.versionText) return true;
  const match = version.versionText.match(/^MySQL (\d+)/);
  return !!match && parseInt(match[1]) >= 8;
}

function getColumnInfo(
  {
    isNullable,
    extra,
    columnName,
    dataType,
    charMaxLength,
    numericPrecision,
    numericScale,
    defaultValue,
    columnComment,
    columnType,
    characterSet,
    collation,
    generationExpression,
    srid,
  },
  driver,
  tableCollation = null
) {
  const { quoteDefaultValues } = driver.__analyserInternals;
  let optionsInfo = {};

  const columnTypeTokens = _.isString(columnType) ? columnType.split(' ').map(x => x.trim().toLowerCase()) : [];
  let fullDataType = dataType;
  if (_.isString(columnType) && TYPES_WITH_FULL_COLUMN_TYPE.includes(dataType?.toLowerCase()))
    fullDataType = getFullColumnType(columnType);
  else if (charMaxLength && isTypeString(dataType)) fullDataType = `${dataType}(${charMaxLength})`;
  else if (numericPrecision && numericScale && isTypeNumeric(dataType))
    fullDataType = `${dataType}(${numericPrecision},${numericScale})`;
  else {
    const optionsTypeParts = columnType.match(/^(enum|set)\((.+)\)/i);
    if (optionsTypeParts?.length) {
      fullDataType = columnType;
      optionsInfo.options = optionsTypeParts[2].split(',').map(option => option.substring(1, option.length - 1));
      optionsInfo.canSelectMultipleOptions = optionsTypeParts[1] == 'set';
    }
  }

  return {
    notNull: !isNullable || isNullable == 'NO' || isNullable == 'no',
    autoIncrement: !!(extra && extra.toLowerCase().includes('auto_increment')),
    columnName,
    columnComment,
    dataType: fullDataType,
    defaultValue: quoteDefaultValues ? quoteDefaultValue(defaultValue, extra) : defaultValue,
    onUpdateExpression: extractOnUpdateExpression(extra),
    isUnsigned: columnTypeTokens.includes('unsigned'),
    isZerofill: columnTypeTokens.includes('zerofill'),
    // following properties are used only in ALTER TABLE (CHANGE/MODIFY COLUMN), to keep column definition unchanged
    // only when different from table default (MySQL 8 would mark column charset as explicit)
    ...(collation && collation != tableCollation ? { characterSet: characterSet || undefined, collation } : {}),
    ...getGeneratedColumnInfo(extra, generationExpression),
    isInvisible: /(^|\s)invisible(\s|$)/i.test(extra || '') || undefined,
    srid: srid ?? undefined,
    ...optionsInfo,
  };
}

function getParametersSqlString(parameters = []) {
  if (!parameters?.length) return '';

  return parameters
    .map(i => {
      const mode = i.parameterMode ? `${i.parameterMode} ` : '';
      const dataType = i.dataType ? ` ${i.dataType.toUpperCase()}` : '';
      return mode + i.parameterName + dataType;
    })
    .join(', ');
}

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver, version) {
    super(dbhan, driver, version);
    this.version = version;
  }

  createQuery(resFileName, typeFields, replacements = {}) {
    let res = sql[resFileName];
    res = this.replaceStringPlaceholder(res, '#DATABASE#', this.dbhan.database);
    return super.createQuery(res, typeFields, replacements);
  }

  getRequestedViewNames(allViewNames) {
    return this.getRequestedObjectPureNames('views', allViewNames);
  }

  async _computeSingleObjectId() {
    const { pureName } = this.singleObjectFilter;
    this.singleObjectId = pureName;
  }

  async getViewTexts(allViewNames) {
    const res = {};

    const views = await this.analyserQuery('viewTexts', ['views']);
    for (const view of views.rows) {
      res[view.pureName] = `CREATE VIEW ${this.dialect.quoteIdentifier(view.pureName)} AS ${view.viewDefinition}`;
    }

    // for (const viewName of this.getRequestedViewNames(allViewNames)) {
    //   try {
    //     const resp = await this.driver.query(this.pool, `SHOW CREATE VIEW \`${viewName}\``);
    //     res[viewName] = resp.rows[0]['Create View'];
    //   } catch (err) {
    //     console.log('ERROR', err);
    //     res[viewName] = `${err}`;
    //   }
    // }
    return res;
  }

  async _runAnalysis() {
    this.feedback({ analysingMessage: 'DBGM-00218 Loading tables' });
    const tables = await this.analyserQuery('tables', ['tables']);
    this.feedback({ analysingMessage: 'DBGM-00219 Loading columns' });
    let columns = await this.analyserQuery('columns', ['tables', 'views']);
    if (columns.isError) {
      // older servers without GENERATION_EXPRESSION column
      columns = await this.analyserQuery('columnsLegacy', ['tables', 'views']);
    }
    if (supportsSrid(this.version)) {
      const srids = await this.analyserQuery('columnSrids', ['tables']);
      for (const { pureName, columnName, srid } of srids.rows) {
        const column = columns.rows.find(x => x.pureName == pureName && x.columnName == columnName);
        if (column) column.srid = srid;
      }
    }
    this.feedback({ analysingMessage: 'DBGM-00220 Loading primary keys' });
    const pkColumns = await this.analyserQuery('primaryKeys', ['tables']);
    this.feedback({ analysingMessage: 'DBGM-00221 Loading foreign keys' });
    const fkColumns = await this.analyserQuery('foreignKeys', ['tables']);
    this.feedback({ analysingMessage: 'DBGM-00222 Loading views' });
    const views = await this.analyserQuery('views', ['views']);
    this.feedback({ analysingMessage: 'DBGM-00223 Loading programmables' });
    const programmables = await this.analyserQuery('programmables', ['procedures', 'functions']);

    const parameters = await this.analyserQuery('parameters', ['procedures', 'functions']);

    const functionParameters = parameters.rows.filter(x => x.routineType == 'FUNCTION');
    const functionNameToParameters = functionParameters.reduce((acc, row) => {
      if (!acc[row.pureName]) acc[row.pureName] = [];

      acc[row.pureName].push({
        ...row,
        dataType: normalizeTypeName(row.dataType),
      });
      return acc;
    }, {});

    const procedureParameters = parameters.rows.filter(x => x.routineType == 'PROCEDURE');
    const procedureNameToParameters = procedureParameters.reduce((acc, row) => {
      if (!acc[row.pureName]) acc[row.pureName] = [];

      acc[row.pureName].push({
        ...row,
        dataType: normalizeTypeName(row.dataType),
      });
      return acc;
    }, {});

    this.feedback({ analysingMessage: 'DBGM-00224 Loading view texts' });
    const viewTexts = await this.getViewTexts(views.rows.map(x => x.pureName));
    this.feedback({ analysingMessage: 'DBGM-00225 Loading indexes' });
    const indexes = await this.analyserQuery('indexes', ['tables']);
    this.feedback({ analysingMessage: 'DBGM-00226 Loading uniques' });

    this.feedback({ analysingMessage: 'DBGM-00227 Loading triggers' });
    const triggers = await this.analyserQuery('triggers');

    this.feedback({ analysingMessage: 'DBGM-00228 Loading scheduler events' });
    const schedulerEvents = await this.analyserQuery('schedulerEvents');

    const uniqueNames = await this.analyserQuery('uniqueNames', ['tables']);
    this.feedback({ analysingMessage: 'DBGM-00229 Finalizing DB structure' });

    const res = {
      tables: tables.rows.map(({ tableCollation, ...table }) => ({
        ...table,
        objectId: table.pureName,
        objectComment: _.isString(table.objectComment) ? table.objectComment : undefined,
        contentHash: _.isDate(table.modifyDate) ? table.modifyDate.toISOString() : table.modifyDate,
        columns: columns.rows
          .filter(col => col.pureName == table.pureName)
          .map(x => getColumnInfo(x, this.driver, tableCollation)),
        primaryKey: DatabaseAnalyser.extractPrimaryKeys(table, pkColumns.rows),
        foreignKeys: DatabaseAnalyser.extractForeignKeys(table, fkColumns.rows),
        tableRowCount: table.tableRowCount,
        indexes: _.uniqBy(
          indexes.rows.filter(
            idx =>
              idx.tableName == table.pureName && !uniqueNames.rows.find(x => x.constraintName == idx.constraintName)
          ),
          'constraintName'
        ).map(idx => ({
          ..._.pick(idx, ['constraintName', 'indexType']),
          isUnique: !idx.nonUnique,
          columns: indexes.rows
            .filter(col => col.tableName == idx.tableName && col.constraintName == idx.constraintName)
            .map(col => ({
              ..._.pick(col, ['columnName', 'isDescending']),
            })),
        })),

        uniques: _.uniqBy(
          indexes.rows.filter(
            idx => idx.tableName == table.pureName && uniqueNames.rows.find(x => x.constraintName == idx.constraintName)
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
      })),
      views: views.rows.map(view => ({
        ...view,
        objectId: view.pureName,
        contentHash: _.isDate(view.modifyDate) ? view.modifyDate.toISOString() : view.modifyDate,
        columns: columns.rows.filter(col => col.pureName == view.pureName).map(x => getColumnInfo(x, this.driver)),
        createSql: viewTexts[view.pureName],
        requiresFormat: true,
      })),
      procedures: programmables.rows
        .filter(x => x.objectType == 'PROCEDURE')
        .map(x => _.omit(x, ['objectType']))
        .map(x => ({
          ...x,
          createSql: `DELIMITER //\n\nCREATE PROCEDURE ${this.dialect.quoteIdentifier(
            x.pureName
          )}(${getParametersSqlString(procedureNameToParameters[x.pureName])})\n${
            x.routineDefinition
          }\n\nDELIMITER ;\n`,
          objectId: x.pureName,
          contentHash: _.isDate(x.modifyDate) ? x.modifyDate.toISOString() : x.modifyDate,
          parameters: procedureNameToParameters[x.pureName],
        })),
      functions: programmables.rows
        .filter(x => x.objectType == 'FUNCTION')
        .map(x => _.omit(x, ['objectType']))
        .map(x => ({
          ...x,
          createSql: `CREATE FUNCTION ${this.dialect.quoteIdentifier(x.pureName)}(${getParametersSqlString(
            functionNameToParameters[x.pureName]?.filter(i => i.parameterMode !== 'RETURN')
          )})\nRETURNS ${x.returnDataType} ${x.isDeterministic == 'YES' ? 'DETERMINISTIC' : 'NOT DETERMINISTIC'}\n${
            x.routineDefinition
          }`,
          objectId: x.pureName,
          contentHash: _.isDate(x.modifyDate) ? x.modifyDate.toISOString() : x.modifyDate,
          parameters: functionNameToParameters[x.pureName],
        })),
      triggers: triggers.rows.map(row => ({
        objectId: 'triggers:' + row.triggerName,
        contentHash: row.modifyDate,
        pureName: row.triggerName,
        eventType: row.eventType,
        triggerTiming: row.triggerTiming,
        tableName: row.tableName,
        createSql: `CREATE TRIGGER ${row.triggerName} ${row.triggerTiming} ${row.eventType} ON ${row.tableName} FOR EACH ROW ${row.definition}`,
      })),
      schedulerEvents: schedulerEvents.rows.map(row => ({
        contentHash: _.isDate(row.LAST_ALTERED) ? row.LAST_ALTERED.toISOString() : row.LAST_ALTERED,
        pureName: row.EVENT_NAME,
        createSql: row.CREATE_SQL,
        objectId: row.EVENT_NAME,
        intervalValue: row.INTERVAL_VALUE,
        intervalField: row.INTERVAL_FIELD,
        starts: row.STARTS,
        status: row.STATUS,
        executeAt: row.EXECUTE_AT,
        lastExecuted: row.LAST_EXECUTED,
        eventType: row.EVENT_TYPE,
        definer: row.DEFINER,
        objectTypeField: 'schedulerEvents',
      })),
    };
    this.feedback({ analysingMessage: null });
    return res;
  }

  async _getFastSnapshot() {
    const tableModificationsQueryData = await this.analyserQuery('tableModifications');
    const procedureModificationsQueryData = await this.analyserQuery('procedureModifications');
    const functionModificationsQueryData = await this.analyserQuery('functionModifications');
    const schedulerEvents = await this.analyserQuery('schedulerEventsModifications');
    const triggers = await this.analyserQuery('triggersModifications');

    return {
      tables: tableModificationsQueryData.rows
        .filter(x => ['BASE TABLE', 'SYSTEM VIEW', 'SYSTEM VERSIONED'].includes(x.objectType))
        .map(x => ({
          ...x,
          objectId: x.pureName,
          contentHash: _.isDate(x.modifyDate) ? x.modifyDate.toISOString() : x.modifyDate,
          tableRowCount: x.tableRowCount,
        })),
      views: tableModificationsQueryData.rows
        .filter(x => x.objectType == 'VIEW')
        .map(x => ({
          ...x,
          objectId: x.pureName,
          contentHash: _.isDate(x.modifyDate) ? x.modifyDate.toISOString() : x.modifyDate,
        })),
      procedures: procedureModificationsQueryData.rows.map(x => ({
        contentHash: x.Modified,
        objectId: x.Name,
        pureName: x.Name,
      })),
      functions: functionModificationsQueryData.rows.map(x => ({
        contentHash: x.Modified,
        objectId: x.Name,
        pureName: x.Name,
      })),
      schedulerEvents: schedulerEvents.rows.map(row => ({
        contentHash: _.isDate(row.LAST_ALTERED) ? row.LAST_ALTERED.toISOString() : row.LAST_ALTERED,
        pureName: row.EVENT_NAME,
        objectId: row.EVENT_NAME,
      })),
      triggers: triggers.rows.map(row => ({
        contentHash: row.modifyDate,
        objectId: 'triggers:' + row.triggerName,
        pureName: row.triggerName,
        tableName: row.tableName,
      })),
    };
  }
}

module.exports = Analyser;
