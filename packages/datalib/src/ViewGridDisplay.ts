import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc } from './GridDisplay';
import type { EngineDriver, ViewInfo, ColumnInfo, DatabaseInfo } from 'dbgate-types';
import { GridConfig, GridCache } from './GridConfig';

export class ViewGridDisplay extends GridDisplay {
  constructor(
    public view: ViewInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    dbinfo: DatabaseInfo,
    serverVersion
  ) {
    super(config, setConfig, cache, setCache, driver, dbinfo, serverVersion);
    this.columns = this.getDisplayColumns(view);
    this.formColumns = this.columns;
    this.filterable = true;
    this.sortable = true;
    this.groupable = false;
    this.editable = false;
    this.supportsReload = true;
    this.baseView = view;
  }

  getDisplayColumns(view: ViewInfo) {
    return (
      view?.columns
        ?.map(col => this.getDisplayColumn(view, col))
        ?.map(col => ({
          ...col,
          isChecked: this.isColumnChecked(col),
        })) || []
    );
  }

  getDisplayColumn(view: ViewInfo, col: ColumnInfo) {
    const uniquePath = [col.columnName];
    const uniqueName = uniquePath.join('.');
    return {
      ...col,
      pureName: view.pureName,
      schemaName: view.schemaName,
      headerText: col.columnName,
      uniqueName,
      uniquePath,
    };
  }

  createSelect(options = {}) {
    const select = this.createSelectBase(this.view, this.view.columns, options);
    return select;
  }
}
