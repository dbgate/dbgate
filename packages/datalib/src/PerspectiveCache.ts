import { PerspectiveDataLoadProps } from './PerspectiveDataProvider';
import _pick from 'lodash/pick';
import _zip from 'lodash/zip';
import _difference from 'lodash/difference';
import debug from 'debug';
import stableStringify from 'json-stable-stringify';
import { PerspectiveDataPattern } from './PerspectiveDataPattern';
import { perspectiveValueMatcher } from './perspectiveTools';

const dbg = debug('dbgate:PerspectiveCache');

export class PerspectiveBindingGroup {
  constructor(public table: PerspectiveCacheTable) {}

  groupSize?: number;
  loadedAll: boolean;
  loadedRows: any[] = [];
  bindingValues: any[];

  matchRow(row) {
    return this.table.bindingColumns.every((column, index) =>
    perspectiveValueMatcher(row[column], this.bindingValues[index])
    );
  }
}

export class PerspectiveCacheTable {
  constructor(props: PerspectiveDataLoadProps, public cache: PerspectiveCache) {
    this.schemaName = props.schemaName;
    this.pureName = props.pureName;
    this.bindingColumns = props.bindingColumns;
    this.dataColumns = props.dataColumns;
    this.loadedAll = false;
  }

  schemaName: string;
  pureName: string;
  bindingColumns?: string[];
  dataColumns: string[];
  allColumns?: boolean;
  loadedAll: boolean;
  loadedRows: any[] = [];
  bindingGroups: { [bindingKey: string]: PerspectiveBindingGroup } = {};
  allRowCount: number = null;

  get loadedCount() {
    return this.loadedRows.length;
  }

  getRowsResult(props: PerspectiveDataLoadProps): { rows: any[]; incomplete: boolean } {
    return {
      rows: this.loadedRows.slice(0, props.topCount),
      incomplete: props.topCount < this.loadedCount || !this.loadedAll,
    };
  }

  getBindingGroup(groupValues: any[]) {
    const key = stableStringify(groupValues);
    return this.bindingGroups[key];
  }

  getUncachedBindingGroups(props: PerspectiveDataLoadProps): any[][] {
    const uncached = [];
    for (const group of props.bindingValues) {
      const key = stableStringify(group);
      const item = this.bindingGroups[key];
      if (!item) {
        uncached.push(group);
      }
    }
    return uncached;
  }

  storeGroupSize(props: PerspectiveDataLoadProps, bindingValues: any[], count: number) {
    const originalBindingValue = props.bindingValues.find(v =>
      _zip(v, bindingValues).every(([x, y]) => perspectiveValueMatcher(x, y))
    );
    // console.log('storeGroupSize NEW', bindingValues);
    // console.log('storeGroupSize ORIGINAL', originalBindingValue);
    if (originalBindingValue) {
      const key = stableStringify(originalBindingValue);
      // console.log('SET SIZE', originalBindingValue, bindingValues, key, count);
      const group = new PerspectiveBindingGroup(this);
      group.bindingValues = bindingValues;
      group.groupSize = count;
      this.bindingGroups[key] = group;
    } else {
      dbg('Group not found', bindingValues);
    }
  }
}

export class PerspectiveCache {
  constructor() {}

  tables: { [tableKey: string]: PerspectiveCacheTable } = {};
  dataPatterns: PerspectiveDataPattern[] = [];

  getTableCache(props: PerspectiveDataLoadProps) {
    const tableKey = stableStringify(
      _pick(props, [
        'schemaName',
        'pureName',
        'bindingColumns',
        'databaseConfig',
        'orderBy',
        'sqlCondition',
      ])
    );
    let res = this.tables[tableKey];

    if (res && _difference(props.dataColumns, res.dataColumns).length > 0 && !res.allColumns) {
      dbg('Delete cache because incomplete columns', props.pureName, res.dataColumns);

      // we have incomplete cache
      delete this.tables[tableKey];
      res = null;
    }

    if (!res) {
      res = new PerspectiveCacheTable(props, this);
      this.tables[tableKey] = res;
      return res;
    }

    // cache could be used
    return res;
  }

  clear() {
    this.tables = {};
    this.dataPatterns = [];
  }
}
