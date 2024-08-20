import debug from 'debug';
import { Condition } from 'dbgate-sqltree';
import type { RangeDefinition } from 'dbgate-types';
import { PerspectiveBindingGroup, PerspectiveCache } from './PerspectiveCache';
import { PerspectiveDataLoader } from './PerspectiveDataLoader';
import { PerspectiveDataPatternDict } from './PerspectiveDataPattern';
import { PerspectiveDatabaseConfig, PerspectiveDatabaseEngineType } from './PerspectiveConfig';

export const PERSPECTIVE_PAGE_SIZE = 100;

const dbg = debug('dbgate:PerspectiveDataProvider');

export interface PerspectiveDataLoadProps {
  databaseConfig: PerspectiveDatabaseConfig;
  schemaName?: string;
  pureName: string;
  dataColumns?: string[];
  allColumns?: boolean;
  orderBy: {
    columnName: string;
    order: 'ASC' | 'DESC';
  }[];
  bindingColumns?: string[];
  bindingValues?: any[][];
  range?: RangeDefinition;
  topCount?: number;
  sqlCondition?: Condition;
  engineType: PerspectiveDatabaseEngineType;
}

export class PerspectiveDataProvider {
  constructor(
    public cache: PerspectiveCache,
    public loader: PerspectiveDataLoader,
    public dataPatterns: PerspectiveDataPatternDict
  ) {}
  async loadData(props: PerspectiveDataLoadProps): Promise<{ rows: any[]; incomplete: boolean }> {
    dbg('load data', props);
    // console.log('LOAD DATA', props);
    if (props.bindingColumns) {
      return this.loadDataNested(props);
    } else {
      return this.loadDataFlat(props);
    }
  }

  async loadDataNested(props: PerspectiveDataLoadProps): Promise<{ rows: any[]; incomplete: boolean }> {
    const tableCache = this.cache.getTableCache(props);
    // console.log('loadDataNested', props);

    const uncached = tableCache.getUncachedBindingGroups(props);
    if (uncached.length > 0) {
      const counts = await this.loader.loadGrouping({
        ...props,
        bindingValues: uncached,
      });
      // console.log('loadDataNested COUNTS', counts);
      for (const resetItem of uncached) {
        tableCache.storeGroupSize(props, resetItem, 0);
      }
      for (const countItem of counts) {
        const { _perspective_group_size_, ...fields } = countItem;
        tableCache.storeGroupSize(
          props,
          props.bindingColumns.map(col => fields[col]),
          _perspective_group_size_
        );
      }
    }

    const rows = [];

    // console.log('CACHE', tableCache.bindingGroups);

    let groupIndex = 0;
    let loadCalled = false;
    let shouldReturn = false;
    for (; groupIndex < props.bindingValues.length; groupIndex++) {
      const groupValues = props.bindingValues[groupIndex];
      const group = tableCache.getBindingGroup(groupValues);

      if (!group.loadedAll) {
        if (loadCalled) {
          shouldReturn = true;
        } else {
          // we need to load next data
          await this.loadNextGroup(props, groupIndex);
          loadCalled = true;
        }
      }

      // console.log('GRP', groupValues, group);
      rows.push(...group.loadedRows);
      if (rows.length >= props.topCount || shouldReturn) {
        return {
          rows: rows.slice(0, props.topCount),
          incomplete: props.topCount < rows.length || !group.loadedAll || groupIndex < props.bindingValues.length - 1,
        };
      }
    }
    if (groupIndex >= props.bindingValues.length) {
      // all groups are fully loaded
      return { rows, incomplete: false };
    }
  }

  async loadNextGroup(props: PerspectiveDataLoadProps, groupIndex: number) {
    const tableCache = this.cache.getTableCache(props);

    const planLoadingGroupIndexes: number[] = [];
    const planLoadingGroups: PerspectiveBindingGroup[] = [];
    let planLoadRowCount = 0;

    const loadPlanned = async () => {
      // console.log(
      //   'LOAD PLANNED',
      //   planLoadingGroupIndexes,
      //   planLoadingGroupIndexes.map(idx => props.bindingValues[idx])
      // );
      const rows = await this.loader.loadData({
        ...props,
        bindingValues: planLoadingGroupIndexes.map(idx => props.bindingValues[idx]),
      });
      // console.log('LOADED PLANNED', rows);
      // distribute rows into groups
      for (const row of rows) {
        const group = planLoadingGroups.find(x => x.matchRow(row));
        if (group) {
          group.loadedRows.push(row);
        }
      }
      for (const group of planLoadingGroups) {
        group.loadedAll = true;
      }
    };

    for (; groupIndex < props.bindingValues.length; groupIndex++) {
      const groupValues = props.bindingValues[groupIndex];
      const group = tableCache.getBindingGroup(groupValues);
      if (!group) continue;
      if (group.loadedAll) continue;
      if (group.groupSize == 0) {
        group.loadedAll = true;
        continue;
      }
      if (group.groupSize >= PERSPECTIVE_PAGE_SIZE) {
        if (planLoadingGroupIndexes.length > 0) {
          await loadPlanned();
          return;
        }
        const nextRows = await this.loader.loadData({
          ...props,
          topCount: null,
          range: {
            offset: group.loadedRows.length,
            limit: PERSPECTIVE_PAGE_SIZE,
          },
          bindingValues: [group.bindingValues],
        });
        group.loadedRows = [...group.loadedRows, ...nextRows];
        group.loadedAll = nextRows.length < PERSPECTIVE_PAGE_SIZE;
        return;
      } else {
        if (planLoadRowCount + group.groupSize > PERSPECTIVE_PAGE_SIZE) {
          await loadPlanned();
          return;
        }
        planLoadingGroupIndexes.push(groupIndex);
        planLoadingGroups.push(group);
        planLoadRowCount += group.groupSize;
      }
    }

    if (planLoadingGroupIndexes.length > 0) {
      await loadPlanned();
    }
  }

  async loadDataFlat(props: PerspectiveDataLoadProps): Promise<{ rows: any[]; incomplete: boolean }> {
    const tableCache = this.cache.getTableCache(props);

    if (props.topCount <= tableCache.loadedCount) {
      return tableCache.getRowsResult(props);
    }

    // load missing rows
    tableCache.dataColumns = props.dataColumns;
    tableCache.allColumns = props.allColumns;

    const nextRows = await this.loader.loadData({
      ...props,
      topCount: null,
      range: {
        offset: tableCache.loadedCount,
        limit: props.topCount - tableCache.loadedCount,
      },
    });

    if (!nextRows) {
      // return tableCache.getRowsResult(props);
      return {
        rows: [],
        incomplete: false,
      };
    }

    if (nextRows.errorMessage) {
      throw new Error(nextRows.errorMessage);
    }

    tableCache.loadedRows = [...tableCache.loadedRows, ...nextRows];
    tableCache.loadedAll = nextRows.length < props.topCount - tableCache.loadedCount;

    // const rows=tableCache.getRows(props);

    return tableCache.getRowsResult(props);
  }

  async loadRowCount(props: PerspectiveDataLoadProps): Promise<number> {
    const tableCache = this.cache.getTableCache(props);

    if (tableCache.allRowCount != null) {
      return tableCache.allRowCount;
    }

    const result = await this.loader.loadRowCount({
      ...props,
    });

    if (result.errorMessage) {
      throw new Error(result.errorMessage);
    }

    tableCache.allRowCount = parseInt(result.count);
    return tableCache.allRowCount;
  }
}
