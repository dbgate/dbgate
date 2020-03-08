import _ from 'lodash';
import { GridConfig, GridCache } from './GridConfig';
import { ForeignKeyInfo, TableInfo, ColumnInfo } from '@dbgate/types';
import { filterName } from './filterName';
import { Select } from '@dbgate/sqltree';

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
  isChecked?: boolean;
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
  setColumnVisibility(uniquePath: string[], isVisible: boolean) {
    const uniqueName = uniquePath.join('.');
    if (uniquePath.length == 1) {
      this.includeInColumnSet('hiddenColumns', uniqueName, !isVisible);
    } else {
      this.includeInColumnSet('addedColumns', uniqueName, isVisible);
    }
  }

  includeInColumnSet(field: keyof GridConfig, uniqueName: string, isIncluded: boolean) {
    if (isIncluded) {
      this.setConfig({
        ...this.config,
        [field]: [...(this.config[field] || []), uniqueName],
      });
    } else {
      this.setConfig({
        ...this.config,
        [field]: (this.config[field] || []).filter(x => x != uniqueName),
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
      return this.enrichExpandedColumns(list).map(col => ({ ...col, isChecked: this.isColumnChecked(col) }));
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

  isColumnChecked(column: DisplayColumn) {
    return column.uniquePath.length == 1
      ? !this.config.hiddenColumns.includes(column.uniqueName)
      : this.config.addedColumns.includes(column.uniqueName);
  }

  getDisplayColumn(table: TableInfo, col: ColumnInfo, parentPath: string[]) {
    const uniquePath = [...parentPath, col.columnName];
    const uniqueName = uniquePath.join('.');
    console.log('this.config.addedColumns', this.config.addedColumns, uniquePath);
    return {
      ...col,
      pureName: table.pureName,
      schemaName: table.schemaName,
      headerText: uniquePath.length == 1 ? col.columnName : `${table.pureName}.${col.columnName}`,
      uniqueName,
      uniquePath,
      isPrimaryKey: table.primaryKey && !!table.primaryKey.columns.find(x => x.columnName == col.columnName),
      foreignKey:
        table.foreignKeys &&
        table.foreignKeys.find(fk => fk.columns.length == 1 && fk.columns[0].columnName == col.columnName),
    };
  }

  addAddedColumnsToSelect(select: Select, columns: DisplayColumn[]) {
    for(const column of columns) {
      if (this.isExpandedColumn(column.uniqueName)) {
        
      }
    }
    // const addedColumns = this.getGridColumns().filter(x=>x.)
  }

  getDisplayColumns(table: TableInfo, parentPath: string[]) {
    return table?.columns
      ?.map(col => this.getDisplayColumn(table, col, parentPath))
      ?.map(col => ({ ...col, isChecked: this.isColumnChecked(col) }));
  }

  getColumns(columnFilter) {
    return this.enrichExpandedColumns(this.columns.filter(col => filterName(columnFilter, col.columnName)));
  }

  getGridColumns() {
    return this.getColumns(null).filter(x => this.isColumnChecked(x));
  }

  isExpandedColumn(uniqueName: string) {
    return this.config.expandedColumns.includes(uniqueName);
  }

  toggleExpandedColumn(uniqueName: string) {
    this.includeInColumnSet('expandedColumns', uniqueName, !this.isExpandedColumn(uniqueName));
  }
}
