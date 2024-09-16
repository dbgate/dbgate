import _compact from 'lodash/compact';
import { SqlDumper } from './SqlDumper';
import { splitQuery } from 'dbgate-query-splitter';
import { dumpSqlSelect } from 'dbgate-sqltree';
import { EngineDriver, QueryResult, RunScriptOptions } from 'dbgate-types';
import { detectSqlFilterBehaviour } from './detectSqlFilterBehaviour';

const dialect = {
  limitSelect: true,
  rangeSelect: true,
  topRecords: false,
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

export async function runCommandOnDriver(pool, driver: EngineDriver, cmd: (dmp: SqlDumper) => void): Promise<void> {
  const dmp = driver.createDumper();
  cmd(dmp as any);
  // console.log('CMD:', dmp.s);
  await driver.query(pool, dmp.s, { discardResult: true });
}

export async function runQueryOnDriver(
  pool,
  driver: EngineDriver,
  cmd: (dmp: SqlDumper) => void
): Promise<QueryResult> {
  const dmp = driver.createDumper();
  cmd(dmp as any);
  // console.log('QUERY:', dmp.s);
  return await driver.query(pool, dmp.s);
}

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
  createDumper(options = null): SqlDumper {
    return new this.dumperClass(this, options);
  },
  async script(pool, sql, options: RunScriptOptions) {
    if (options?.useTransaction && this.supportsTransactions) {
      runCommandOnDriver(pool, this, dmp => dmp.beginTransaction());
    }
    for (const sqlItem of splitQuery(sql, this.getQuerySplitterOptions('script'))) {
      try {
        await this.query(pool, sqlItem, { discardResult: true });
      } catch (err) {
        if (options?.useTransaction && this.supportsTransactions) {
          runCommandOnDriver(pool, this, dmp => dmp.rollbackTransaction());
        }
        throw err;
      }
    }
    if (options?.useTransaction && this.supportsTransactions) {
      runCommandOnDriver(pool, this, dmp => dmp.commitTransaction());
    }
  },
  async operation(pool, operation, options: RunScriptOptions) {
    throw new Error('Operation not defined in target driver');
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
  showConnectionTab: field => true,
  getAccessTokenFromAuth: async (connection, req) => null,
  getFilterBehaviour(dataType: string, standardFilterBehaviours) {
    return detectSqlFilterBehaviour(dataType);
  },

  getCollectionExportQueryScript(collection: string, condition: any, sort: any) {
    return null;
  },
  getCollectionExportQueryJson(collection: string, condition: any, sort: any) {
    return null;
  },
  getScriptTemplates(objectTypeField) {
    return [];
  },
  getScriptTemplateContent(scriptTemplate, props) {
    return null;
  },

  dataEditorTypesBehaviour: {
    parseSqlNull: true,
    parseHexAsBuffer: true,
  },

  createSaveChangeSetScript(changeSet, dbinfo, defaultCreator) {
    return defaultCreator(changeSet, dbinfo);
  },

  adaptTableInfo(table) {
    return table;
  }
};
