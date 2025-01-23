import type {
  DatabaseInfo,
  EngineDriver,
  FunctionInfo,
  ProcedureInfo,
  SchedulerEventInfo,
  TableInfo,
  TriggerInfo,
  ViewInfo,
} from 'dbgate-types';
import _flatten from 'lodash/flatten';
import _uniqBy from 'lodash/uniqBy';
import { getLogger } from './getLogger';
import { SqlDumper } from './SqlDumper';
import { extendDatabaseInfo } from './structureTools';
import { extractErrorLogData } from './stringTools';

const logger = getLogger('sqlGenerator');

interface SqlGeneratorOptions {
  dropTables: boolean;
  checkIfTableExists: boolean;
  dropReferences: boolean;
  createTables: boolean;
  createReferences: boolean;
  createForeignKeys: boolean;
  createIndexes: boolean;
  insert: boolean;
  skipAutoincrementColumn: boolean;
  disableConstraints: boolean;
  omitNulls: boolean;
  truncate: boolean;

  dropViews: boolean;
  checkIfViewExists: boolean;
  createViews: boolean;

  dropMatviews: boolean;
  checkIfMatviewExists: boolean;
  createMatviews: boolean;

  dropProcedures: boolean;
  checkIfProcedureExists: boolean;
  createProcedures: boolean;

  dropFunctions: boolean;
  checkIfFunctionExists: boolean;
  createFunctions: boolean;

  dropTriggers: boolean;
  checkIfTriggerExists: boolean;
  createTriggers: boolean;

  dropSchedulerEvents: boolean;
  checkIfSchedulerEventExists: boolean;
  createSchedulerEvents: boolean;
}

interface SqlGeneratorObject {
  schemaName: string;
  pureName: string;
  objectTypeField: 'tables' | 'views' | 'procedures' | 'functions' | 'triggers' | 'schedulerEvents';
}

export class SqlGenerator {
  private tables: TableInfo[];
  private views: ViewInfo[];
  private matviews: ViewInfo[];
  private procedures: ProcedureInfo[];
  private functions: FunctionInfo[];
  private triggers: TriggerInfo[];
  private schedulerEvents: SchedulerEventInfo[];
  public dbinfo: DatabaseInfo;
  public isTruncated = false;
  public isUnhandledException = false;

  constructor(
    dbinfo: DatabaseInfo,
    public options: SqlGeneratorOptions,
    public objects: SqlGeneratorObject[],
    public dmp: SqlDumper,
    public driver: EngineDriver,
    public pool
  ) {
    this.dbinfo = extendDatabaseInfo(dbinfo);
    this.tables = this.extract('tables');
    this.views = this.extract('views');
    this.matviews = this.extract('matviews');
    this.procedures = this.extract('procedures');
    this.functions = this.extract('functions');
    this.triggers = this.extract('triggers');
    this.schedulerEvents = this.extract('schedulerEvents');
  }

  private handleException = error => {
    logger.error(extractErrorLogData(error), 'Unhandled error');
    this.isUnhandledException = true;
  };

  async dump() {
    try {
      process.on('uncaughtException', this.handleException);

      this.dropObjects(this.procedures, 'Procedure');
      if (this.checkDumper()) return;
      this.dropObjects(this.functions, 'Function');
      if (this.checkDumper()) return;
      this.dropObjects(this.views, 'View');
      if (this.checkDumper()) return;
      this.dropObjects(this.matviews, 'Matview');
      if (this.checkDumper()) return;
      this.dropObjects(this.triggers, 'Trigger');
      if (this.checkDumper()) return;
      this.dropObjects(this.schedulerEvents, 'SchedulerEvent');
      if (this.checkDumper()) return;

      this.dropTables();
      if (this.checkDumper()) return;

      this.createTables();
      if (this.checkDumper()) return;

      this.truncateTables();
      if (this.checkDumper()) return;

      await this.insertData();
      if (this.checkDumper()) return;

      this.createForeignKeys();
      if (this.checkDumper()) return;

      this.createObjects(this.procedures, 'Procedure');
      if (this.checkDumper()) return;
      this.createObjects(this.functions, 'Function');
      if (this.checkDumper()) return;
      this.createObjects(this.views, 'View');
      if (this.checkDumper()) return;
      this.createObjects(this.matviews, 'Matview');
      if (this.checkDumper()) return;
      this.createObjects(this.triggers, 'Trigger');
      if (this.checkDumper()) return;
      this.createObjects(this.schedulerEvents, 'SchedulerEvent');
      if (this.checkDumper()) return;
    } finally {
      process.off('uncaughtException', this.handleException);
    }
  }

  createForeignKeys() {
    const fks = [];
    if (this.options.createForeignKeys) fks.push(..._flatten(this.tables.map(x => x.foreignKeys || [])));
    if (this.options.createReferences) fks.push(..._flatten(this.tables.map(x => x.dependencies || [])));
    for (const fk of _uniqBy(fks, 'constraintName')) {
      this.dmp.createForeignKey(fk);
      if (this.checkDumper()) return;
    }
  }

  truncateTables() {
    if (this.options.truncate) {
      for (const table of this.tables) {
        this.dmp.truncateTable(table);
        if (this.checkDumper()) return;
      }
    }
  }

  createTables() {
    if (this.options.createTables) {
      for (const table of this.tables) {
        this.dmp.createTable({
          ...table,
          foreignKeys: [],
          dependencies: [],
          indexes: [],
        });
        if (this.checkDumper()) return;
      }
    }
    if (this.options.createIndexes) {
      for (const index of _flatten(this.tables.map(x => x.indexes || []))) {
        this.dmp.createIndex(index);
      }
    }
  }

  async insertData() {
    if (!this.options.insert) return;

    this.enableConstraints(false);

    for (const table of this.tables) {
      await this.insertTableData(table);
      if (this.checkDumper()) return;
    }

    this.enableConstraints(true);
  }

  checkDumper() {
    if (this.dmp.s.length > 4000000) {
      if (!this.isTruncated) {
        this.dmp.putRaw('\n');
        this.dmp.comment(' *************** SQL is truncated ******************');
        this.dmp.putRaw('\n');
      }
      this.isTruncated = true;
      return true;
    }
    return false;
  }

  dropObjects(list, name) {
    if (this.options[`drop${name}s`]) {
      for (const item of list) {
        this.dmp[`drop${name}`](item, { testIfExists: this.options[`checkIf${name}Exists`] });
        if (this.checkDumper()) return;
      }
    }
  }

  createObjects(list, name) {
    if (this.options[`create${name}s`]) {
      for (const item of list) {
        this.dmp[`create${name}`](item);
        if (this.checkDumper()) return;
      }
    }
  }

  dropTables() {
    if (this.options.dropReferences) {
      for (const fk of _flatten(this.tables.map(x => x.dependencies || []))) {
        this.dmp.dropForeignKey(fk);
      }
    }

    if (this.options.dropTables) {
      for (const table of this.tables) {
        this.dmp.dropTable(table, { testIfExists: this.options.checkIfTableExists });
      }
    }
  }

  async insertTableData(table: TableInfo) {
    const dmpLocal = this.driver.createDumper();
    dmpLocal.put('^select * ^from %f', table);

    const autoinc = table.columns.find(x => x.autoIncrement);
    if (autoinc && !this.options.skipAutoincrementColumn) {
      this.dmp.allowIdentityInsert(table, true);
    }

    const readable = await this.driver.readQuery(this.pool, dmpLocal.s, table);
    await this.processReadable(table, readable);

    if (autoinc && !this.options.skipAutoincrementColumn) {
      this.dmp.allowIdentityInsert(table, false);
    }
  }

  processReadable(table: TableInfo, readable) {
    const columnsFiltered = this.options.skipAutoincrementColumn
      ? table.columns.filter(x => !x.autoIncrement)
      : table.columns;
    const columnNames = columnsFiltered.map(x => x.columnName);
    let isClosed = false;
    let isHeaderRead = false;

    return new Promise(resolve => {
      readable.on('data', chunk => {
        if (isClosed) return;
        if (!isHeaderRead) {
          isHeaderRead = true;
          return;
        }

        if (this.checkDumper()) {
          isClosed = true;
          resolve(undefined);
          readable.destroy();
          return;
        }

        const columnNamesCopy = this.options.omitNulls ? columnNames.filter(col => chunk[col] != null) : columnNames;
        this.dmp.put(
          '^insert ^into %f (%,i) ^values (%,v);&n',
          table,
          columnNamesCopy,
          columnNamesCopy.map(col => chunk[col])
        );
      });
      readable.on('end', () => {
        resolve(undefined);
      });
    });
  }

  extract(objectTypeField) {
    return (
      this.dbinfo[objectTypeField]?.filter(x =>
        this.objects.find(
          y => x.pureName == y.pureName && x.schemaName == y.schemaName && y.objectTypeField == objectTypeField
        )
      ) ?? []
    );
  }

  enableConstraints(enabled) {
    if (this.options.disableConstraints) {
      if (this.driver.dialect.enableConstraintsPerTable) {
        for (const table of this.tables) {
          this.dmp.enableConstraints(table, enabled);
        }
      } else {
        this.dmp.enableConstraints(null, enabled);
      }
    }
  }
}
