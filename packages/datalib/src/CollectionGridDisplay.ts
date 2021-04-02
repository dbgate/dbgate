import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc } from './GridDisplay';
import { EngineDriver, ViewInfo, ColumnInfo, CollectionInfo } from 'dbgate-types';
import { GridConfig, GridCache } from './GridConfig';

export class CollectionGridDisplay extends GridDisplay {
  constructor(
    public collection: CollectionInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    loadedRows
  ) {
    super(config, setConfig, cache, setCache, driver);
    this.columns = this.getDisplayColumns(loadedRows || []);
    this.filterable = true;
    this.sortable = true;
    this.editable = false;
    this.supportsReload = true;
  }

  getDisplayColumns(rows) {
    const res = [];
    for (const row of rows) {
      for (const name of Object.keys(row)) {
        if (res.find(x => x.columnName == name)) continue;
        res.push(this.getDisplayColumn(name));
      }
    }
    return (
      res.map(col => ({
        ...col,
        isChecked: this.isColumnChecked(col),
      })) || []
    );
  }

  getDisplayColumn(columnName: string) {
    const uniquePath = [columnName];
    const uniqueName = uniquePath.join('.');
    return {
      columnName,
      headerText: columnName,
      uniqueName,
      uniquePath,
    };
  }
}
