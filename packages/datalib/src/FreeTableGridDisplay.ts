import _ from 'lodash';
import { EngineDriver, ViewInfo, ColumnInfo } from 'dbgate-types';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc } from './GridDisplay';
import { GridConfig, GridCache } from './GridConfig';
import { FreeTableModel } from './FreeTableModel';

export class FreeTableGridDisplay extends GridDisplay {
  constructor(
    public model: FreeTableModel,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc
  ) {
    super(config, setConfig, cache, setCache);
    this.columns = this.getDisplayColumns(model);
    this.filterable = false;
    this.sortable = false;
  }

  getDisplayColumns(model: FreeTableModel) {
    return (
      model?.structure?.columns
        ?.map((col) => this.getDisplayColumn(col))
        ?.map((col) => ({
          ...col,
          isChecked: this.isColumnChecked(col),
        })) || []
    );
  }

  getDisplayColumn( col: ColumnInfo) {
    const uniquePath = [col.columnName];
    const uniqueName = uniquePath.join('.');
    return {
      ...col,
      pureName: 'data',
      schemaName: '',
      headerText: col.columnName,
      uniqueName,
      uniquePath,
    };
  }
}
