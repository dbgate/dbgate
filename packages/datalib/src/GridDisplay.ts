import _ from 'lodash';
import { GridConfig, GridCache } from './GridConfig';
import { ForeignKeyInfo, TableInfo } from '@dbgate/types';
import { filterName } from './filterName';

export interface DisplayColumn {
  schemaName: string;
  pureName: string;
  columnName: string;
  headerText: string;
  uniqueName: string;
  uniquePath: string[];
  notNull: boolean;
  autoIncrement: boolean;
  isPrimaryKey: boolean;
  foreignKey: ForeignKeyInfo;
  isChecked: boolean;
}

export abstract class GridDisplay {
  constructor(
    public config: GridConfig,
    protected setConfig: (config: GridConfig) => void,
    protected cache: GridCache,
    protected setCache: (config: GridCache) => void,
    protected getTableInfo: ({ schemaName, pureName }) => Promise<TableInfo>
  ) {}
  abstract getPageQuery(offset: number, count: number): string;
  columns: DisplayColumn[];
  setColumnVisibility(uniqueName, isVisible) {
    if (isVisible) {
      this.setConfig({
        ...this.config,
        hiddenColumns: (this.config.hiddenColumns || []).filter(x => x != uniqueName),
      });
    } else {
      this.setConfig({
        ...this.config,
        hiddenColumns: [...(this.config.hiddenColumns || []), uniqueName],
      });
    }
  }

  showAllColumns() {
    this.setConfig({
      ...this.config,
      hiddenColumns: [],
    });
  }

  hideAllColumns() {
    this.setConfig({
      ...this.config,
      hiddenColumns: this.columns.map(x => x.uniqueName),
    });
  }

  get hiddenColumnIndexes() {
    return (this.config.hiddenColumns || []).map(x => _.findIndex(this.columns, y => y.uniqueName == x));
  }

  enrichExpandedColumns(list: DisplayColumn[]): DisplayColumn[] {
    const res = [];
    for (const item of list) {
      res.push(item);
      if (this.isExpandedColumn(item.uniqueName)) res.push(...this.getExpandedColumns(item, item.uniqueName));
    }
    return res;
  }

  getExpandedColumns(column: DisplayColumn, uniqueName: string) {
    const list = this.cache.subcolumns[uniqueName];
    if (list) {
      return this.enrichExpandedColumns(list);
    } else {
      // load expanded columns
      const { foreignKey } = column;
      this.getTableInfo({ schemaName: foreignKey.refSchemaName, pureName: foreignKey.refTableName }).then(table => {
        this.setCache({
          ...this.cache,
          subcolumns: {
            ...this.cache.subcolumns,
            [uniqueName]: this.getDisplayColumns(table, column.uniquePath),
          },
        });
      });
    }
    return [];
  }

  getDisplayColumns(table: TableInfo, parentPath: string[]) {
    return table.columns.map(col => ({
      ...col,
      pureName: table.pureName,
      schemaName: table.schemaName,
      headerText: col.columnName,
      uniqueName: [...parentPath, col.columnName].join(','),
      uniquePath: [...parentPath, col.columnName],
      isPrimaryKey: table.primaryKey && !!table.primaryKey.columns.find(x => x.columnName == col.columnName),
      foreignKey:
        table.foreignKeys &&
        table.foreignKeys.find(fk => fk.columns.length == 1 && fk.columns[0].columnName == col.columnName),
      isChecked: !(this.config.hiddenColumns && this.config.hiddenColumns.includes(col.columnName)),
    }));
  }

  getColumns(columnFilter) {
    return this.enrichExpandedColumns(this.columns.filter(col => filterName(columnFilter, col.columnName)));
  }

  isExpandedColumn(uniqueName: string) {
    return this.config.expandedColumns.includes(uniqueName);
  }

  toggleExpandedColumn(uniqueName: string) {
    if (this.isExpandedColumn(uniqueName)) {
      this.setConfig({
        ...this.config,
        expandedColumns: (this.config.expandedColumns || []).filter(x => x != uniqueName),
      });
    } else {
      this.setConfig({
        ...this.config,
        expandedColumns: [...this.config.expandedColumns, uniqueName],
      });
    }
  }
}
