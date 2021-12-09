import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc } from './GridDisplay';
import { QueryResultColumn } from 'dbgate-types';
import { GridConfig, GridCache } from './GridConfig';
import { analyseCollectionDisplayColumns } from './CollectionGridDisplay';

export class JslGridDisplay extends GridDisplay {
  constructor(
    jslid,
    structure,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    rows: any
  ) {
    super(config, setConfig, cache, setCache, null);

    this.filterable = true;

    if (structure.columns) {
      this.columns = _.uniqBy(
        structure.columns
          .map(col => ({
            columnName: col.columnName,
            headerText: col.columnName,
            uniqueName: col.columnName,
            uniquePath: [col.columnName],
            notNull: col.notNull,
            autoIncrement: col.autoIncrement,
            pureName: null,
            schemaName: null,
          }))
          ?.map(col => ({
            ...col,
            isChecked: this.isColumnChecked(col),
          })),
        col => col.uniqueName
      );
    }

    if (structure.__isDynamicStructure) {
      this.columns = analyseCollectionDisplayColumns(rows, this);
    }

    if (!this.columns) this.columns = [];
  }
}
