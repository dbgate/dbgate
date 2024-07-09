import _ from 'lodash';
import { filterName, isTableColumnUnique } from 'dbgate-tools';
import { GridDisplay, ChangeCacheFunc, DisplayColumn, DisplayedColumnInfo, ChangeConfigFunc } from './GridDisplay';
import type {
  TableInfo,
  EngineDriver,
  ViewInfo,
  ColumnInfo,
  NamedObjectInfo,
  DatabaseInfo,
  ForeignKeyInfo,
} from 'dbgate-types';
import { GridConfig, GridCache, createGridCache } from './GridConfig';
import { Expression, Select, treeToSql, dumpSqlSelect, ColumnRefExpression } from 'dbgate-sqltree';

export interface CustomGridColumn {
  columnName: string;
  columnLabel: string;
  isPrimaryKey?: boolean;
}

export class CustomGridDisplay extends GridDisplay {
  constructor(
    public tableName: NamedObjectInfo,
    columns: CustomGridColumn[],
    driver: EngineDriver,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    dbinfo: DatabaseInfo,
    serverVersion,
    isReadOnly = false
  ) {
    super(config, setConfig, cache, setCache, driver, dbinfo, serverVersion);

    this.columns = columns.map(col => ({
      columnName: col.columnName,
      headerText: col.columnLabel,
      uniqueName: col.columnName,
      uniquePath: [col.columnName],
      isPrimaryKey: col.isPrimaryKey,
      isForeignKeyUnique: false,
      schemaName: tableName.schemaName,
      pureName: tableName.pureName,
    }));

    this.changeSetKeyFields = columns.filter(x => x.isPrimaryKey).map(x => x.columnName);
    this.baseTable = {
      ...tableName,
      columns: this.columns.map(x => ({ ...tableName, columnName: x.columnName, dataType: 'string' })),
      foreignKeys: [],
    };

    this.filterable = true;
    this.sortable = true;
    this.groupable = false;
    this.editable = !isReadOnly;
    this.supportsReload = true;
  }

  createSelect(options = {}) {
    const select = this.createSelectBase(
      this.tableName,
      // @ts-ignore
      this.columns.map(col => ({
        columnName: col.columnName,
      })),
      options
    );
    return select;
  }
}
