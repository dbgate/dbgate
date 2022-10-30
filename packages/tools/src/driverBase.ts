import _compact from 'lodash/compact';
import { SqlDumper } from './SqlDumper';
import { splitQuery } from 'dbgate-query-splitter';
import { dumpSqlSelect } from 'dbgate-sqltree';

const dialect = {
  limitSelect: true,
  rangeSelect: true,
  offsetFetchRangeSyntax: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar(max)',
  quoteIdentifier(s) {
    return s;
  },
  columnProperties: {
    isSparse: false,
    isPersisted: false,
  },
  defaultSchemaName: null,
};

export const driverBase = {
  analyserClass: null,
  dumperClass: SqlDumper,
  dialect,
  databaseEngineTypes: ['sql'],
  supportedCreateDatabase: true,

  async analyseFull(pool, version) {
    const analyser = new this.analyserClass(pool, this, version);
    return analyser.fullAnalysis();
  },
  async analyseSingleObject(pool, name, typeField = 'tables') {
    const analyser = new this.analyserClass(pool, this);
    return analyser.singleObjectAnalysis(name, typeField);
  },
  analyseSingleTable(pool, name) {
    return this.analyseSingleObject(pool, name, 'tables');
  },
  async analyseIncremental(pool, structure, version) {
    const analyser = new this.analyserClass(pool, this, version);
    return analyser.incrementalAnalysis(structure);
  },
  createDumper(options = null) {
    return new this.dumperClass(this, options);
  },
  async script(pool, sql) {
    for (const sqlItem of splitQuery(sql, this.getQuerySplitterOptions('script'))) {
      await this.query(pool, sqlItem, { discardResult: true });
    }
  },
  getNewObjectTemplates() {
    if (this.databaseEngineTypes.includes('sql')) {
      return [{ label: 'New view', sql: 'CREATE VIEW myview\nAS\nSELECT * FROM table1' }];
    }
    return [];
  },
  async loadFieldValues(pool, name, columnName, search) {
    const dmp = this.createDumper();
    const select = {
      commandType: 'select',
      distinct: true,
      topRecords: 100,

      from: {
        name,
      },
      columns: [
        {
          exprType: 'column',
          columnName,
          alias: 'value',
        },
      ],
      orderBy: [
        {
          exprType: 'column',
          columnName,
        },
      ],
    };

    if (search) {
      const tokens = _compact(search.split(' ').map(x => x.trim()));
      if (tokens.length > 0) {
        // @ts-ignore
        select.where = {
          conditionType: 'and',
          conditions: tokens.map(token => ({
            conditionType: 'like',
            left: {
              exprType: 'column',
              columnName,
            },
            right: {
              exprType: 'value',
              value: `%${token}%`,
            },
          })),
        };
      }
    }

    // @ts-ignore
    dumpSqlSelect(dmp, select);

    const resp = await this.query(pool, dmp.s);
    return resp.rows;
  },
  readJsonQuery(pool, select, structure) {
    const dmp = this.createDumper();
    dumpSqlSelect(dmp, select);
    return this.readQuery(pool, dmp.s, structure);
  },
  showConnectionField: (field, values) => false,
  showConnectionTab: (field) => true,
};
