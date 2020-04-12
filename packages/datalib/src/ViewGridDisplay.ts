import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc } from './GridDisplay';
import { EngineDriver, ViewInfo, ColumnInfo } from '@dbgate/types';
import { GridConfig, GridCache } from './GridConfig';

export class ViewGridDisplay extends GridDisplay {
  constructor(
    public view: ViewInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: (config: GridConfig) => void,
    cache: GridCache,
    setCache: ChangeCacheFunc
  ) {
    super(config, setConfig, cache, setCache, driver);
    this.columns = this.getDisplayColumns(view);
    this.filterable = true;
    this.sortable = true;
    this.editable = true;
  }

  getDisplayColumns(view: ViewInfo) {
    return (
      view?.columns
        ?.map((col) => this.getDisplayColumn(view, col))
        ?.map((col) => ({
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

  createSelect() {
    const select = this.createSelectBase(this.view, this.view.columns);
    return select;
  }
}
