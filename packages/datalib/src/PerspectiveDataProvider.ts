import { RangeDefinition } from 'dbgate-types';
import { PerspectiveCache } from './PerspectiveCache';
import { PerspectiveDataLoader } from './PerspectiveDataLoader';

export interface PerspectiveDatabaseConfig {
  conid: string;
  database: string;
}

export interface PerspectiveDataLoadProps {
  databaseConfig: PerspectiveDatabaseConfig;
  schemaName: string;
  pureName: string;
  dataColumns: string[];
  orderBy: string[];
  bindingColumns?: string[];
  bindingValues?: any[][];
  range?: RangeDefinition;
  topCount?: number;
}

export class PerspectiveDataProvider {
  constructor(public cache: PerspectiveCache, public loader: PerspectiveDataLoader) {}
  async loadData(props: PerspectiveDataLoadProps): Promise<{ rows: any[]; incomplete: boolean }> {
    const tableCache = this.cache.getTableCache(props);

    if (props.topCount <= tableCache.loadedCount) {
      return tableCache.getRowsResult(props);
    }

    // load missing rows
    tableCache.dataColumns = props.dataColumns;

    const nextRows = await this.loader.loadData({
      ...props,
      topCount: null,
      range: {
        offset: tableCache.loadedCount,
        limit: props.topCount - tableCache.loadedCount,
      },
    });

    tableCache.loadedRows = [...tableCache.loadedRows, ...nextRows];
    tableCache.loadedAll = nextRows.length < props.topCount - tableCache.loadedCount;

    // const rows=tableCache.getRows(props);

    return tableCache.getRowsResult(props);

    // return {
    //   rows: await this.loader.loadData(props),
    //   incomplete: true,
    // };
  }
}
