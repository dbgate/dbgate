import { DatabaseInfo, EngineDriver, FunctionInfo, ProcedureInfo, TableInfo, ViewInfo } from 'dbgate-types';
import { SqlDumper } from './SqlDumper';

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
}

interface SqlGeneratorObject {
  schemaName: string;
  pureName: string;
  objectTypeField: 'tables' | 'views' | 'procedures' | 'functions';
}

export class SqlGenerator {
  private tables: TableInfo[];
  private views: ViewInfo[];
  private procedures: ProcedureInfo[];
  private functions: FunctionInfo[];
  constructor(
    public dbinfo: DatabaseInfo,
    public options: SqlGeneratorOptions,
    public objects: SqlGeneratorObject[],
    public dmp: SqlDumper,
    public driver: EngineDriver,
    public pool
  ) {
    this.tables = this.extract('tables');
    this.views = this.extract('views');
    this.procedures = this.extract('procedures');
    this.functions = this.extract('functions');
  }

  checkDumper() {
    return false;
  }

  async dump() {
    if (this.options.createTables) {
      for (const table of this.tables) {
        this.dmp.createTable(table);
        if (this.checkDumper()) return;
      }
    }
    if (this.options.insert) {
      for (const table of this.tables) {
        await this.insertTableData(table);
        if (this.checkDumper()) return;
      }
    }
  }

  async insertTableData(table: TableInfo) {
    const dmp = this.driver.createDumper();
    dmp.put('^select * ^from %f', table);
    const readable = await this.driver.readQuery(this.pool, dmp.s, table);
    await this.processReadable(table, readable);
  }

  processReadable(table: TableInfo, readable) {
    const columnNames = table.columns.map(x => x.columnName);
    return new Promise(resolve => {
      readable.on('data', chunk => {
        // const chunk = readable.read();
        // if (!chunk) return;
        this.dmp.put(
          '^insert ^into %f (%,i) ^values (%,v);&n',
          table,
          columnNames,
          columnNames.map(col => chunk[col])
        );
      });
      readable.on('end', () => {
        resolve(undefined);
      });
    });
  }

  extract(objectTypeField) {
    return this.dbinfo[objectTypeField].filter(x =>
      this.objects.find(
        y => x.pureName == y.pureName && x.schemaName == y.schemaName && y.objectTypeField == objectTypeField
      )
    );
  }
}
