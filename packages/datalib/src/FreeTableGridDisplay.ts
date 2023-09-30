import _ from 'lodash';
import type { EngineDriver, ViewInfo, ColumnInfo } from 'dbgate-types';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc } from './GridDisplay';
import { GridConfig, GridCache } from './GridConfig';
import { FreeTableModel } from './FreeTableModel';
import { analyseCollectionDisplayColumns } from '.';

export class FreeTableGridDisplay extends GridDisplay {
  constructor(
    public model: FreeTableModel,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc
  ) {
    super(config, setConfig, cache, setCache);
    this.columns = model?.structure?.__isDynamicStructure
      ? analyseCollectionDisplayColumns(model?.rows, this)
      : this.getDisplayColumns(model);
    this.filterable = false;
    this.sortable = false;
  }

  getDisplayColumns(model: FreeTableModel) {
    return _.uniqBy(
      model?.structure?.columns
        ?.map(col => this.getDisplayColumn(col))
        ?.map(col => ({
          ...col,
          isChecked: this.isColumnChecked(col),
        })) || [],
      col => col.uniqueName
    );
  }

  getDisplayColumn(col: ColumnInfo) {
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
