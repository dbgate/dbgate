import { RangeDefinition } from 'dbgate-types';
import { PerspectiveDataLoadProps } from './PerspectiveDataProvider';
import _pick from 'lodash/pick';
import _omit from 'lodash/omit';
import _difference from 'lodash/difference';
import debug from 'debug';

const dbg = debug('dbgate:PerspectiveCache');

export class PerspectiveCacheTable {
  constructor(props: PerspectiveDataLoadProps) {
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
  loadedAll: boolean;
  loadedRows: any[] = [];
  get loadedCount() {
    return this.loadedRows.length;
  }

  getRowsResult(props: PerspectiveDataLoadProps): { rows: any[]; incomplete: boolean } {
    return {
      rows: this.loadedRows.slice(0, props.topCount),
      incomplete: props.topCount < this.loadedCount || !this.loadedAll,
    };
  }
}

export class PerspectiveCache {
  constructor(public stableStringify) {}

  tables: { [tableKey: string]: PerspectiveCacheTable } = {};

  getTableCache(props: PerspectiveDataLoadProps) {
    const tableKey = this.stableStringify(
      _pick(props, ['schemaName', 'pureName', 'bindingColumns', 'databaseConfig', 'orderBy'])
    );
    let res = this.tables[tableKey];

    if (res && _difference(props.dataColumns, res.dataColumns).length > 0) {
      dbg('Delete cache because incomplete columns', props.pureName, res.dataColumns);

      // we have incomplete cache
      delete this.tables[tableKey];
      res = null;
    }

    if (!res) {
      res = new PerspectiveCacheTable(props);
      this.tables[tableKey] = res;
      return res;
    }

    // cache could be used
    return res;
  }
}
