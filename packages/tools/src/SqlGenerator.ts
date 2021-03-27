import { DatabaseInfo, FunctionInfo, ProcedureInfo, TableInfo, ViewInfo } from 'dbgate-types';
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
    public dmp: SqlDumper
  ) {
    this.tables = this.extract('tables');
    this.views = this.extract('views');
    this.procedures = this.extract('procedures');
    this.functions = this.extract('functions');
  }

  checkDumper() {
    return false;
  }

  dump() {
    if (this.options.createTables) {
      for (const table of this.tables) {
        this.dmp.createTable(table);
        if (this.checkDumper()) return;
      }
    }
  }

  extract(objectTypeField) {
    return this.dbinfo[objectTypeField].filter(x =>
      this.objects.find(
        y => x.pureName == y.pureName && x.schemaName == y.schemaName && y.objectTypeField == objectTypeField
      )
    );
  }
}
