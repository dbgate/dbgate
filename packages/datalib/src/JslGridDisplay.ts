import { GridDisplay, ChangeCacheFunc } from './GridDisplay';
import { QueryResultColumn } from '@dbgate/types';
import { GridConfig, GridCache } from './GridConfig';

export class JslGridDisplay extends GridDisplay {
  constructor(
    jslid,
    columns: QueryResultColumn[],
    config: GridConfig,
    setConfig: (config: GridConfig) => void,
    cache: GridCache,
    setCache: ChangeCacheFunc
  ) {
    super(config, setConfig, cache, setCache, null, null);

    this.columns = columns
      .map((col) => ({
        columnName: col.columnName,
        headerText: col.columnName,
        uniqueName: col.columnName,
        uniquePath: [col.columnName],
        notNull: col.notNull,
        autoIncrement: col.autoIncrement,
        pureName: null,
        schemaName: null,
      }))
      ?.map((col) => ({
        ...col,
        isChecked: this.isColumnChecked(col),
      }));
  }
}
