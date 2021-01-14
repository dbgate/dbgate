import _ from 'lodash';
import { GridConfig, GridCache, GridConfigColumns, createGridCache, GroupFunc } from './GridConfig';
import { ForeignKeyInfo, TableInfo, ColumnInfo, EngineDriver, NamedObjectInfo, DatabaseInfo } from 'dbgate-types';
import { parseFilter, getFilterType } from 'dbgate-filterparser';
import { filterName } from './filterName';
import { ChangeSetFieldDefinition, ChangeSetRowDefinition } from './ChangeSet';
import { Expression, Select, treeToSql, dumpSqlSelect, Condition } from 'dbgate-sqltree';
import { isTypeLogical } from 'dbgate-tools';
import { ChangeCacheFunc, ChangeConfigFunc, DisplayColumn } from './GridDisplay';

export class FormViewDisplay {
  isLoadedCorrectly = true;
  columns: DisplayColumn[];
  public baseTable: TableInfo;

  constructor(
    public config: GridConfig,
    protected setConfig: ChangeConfigFunc,
    public cache: GridCache,
    protected setCache: ChangeCacheFunc,
    public driver?: EngineDriver,
    public dbinfo: DatabaseInfo = null
  ) {}

  addFilterColumn(column) {
    if (!column) return;
    this.setConfig((cfg) => ({
      ...cfg,
      formFilterColumns: [...(cfg.formFilterColumns || []), column.uniqueName],
    }));
  }

  setFilter(uniqueName, value) {
    this.setConfig((cfg) => ({
      ...cfg,
      filters: {
        ...cfg.filters,
        [uniqueName]: value,
      },
    }));
  }

  removeFilter(uniqueName) {
    this.setConfig((cfg) => ({
      ...cfg,
      formFilterColumns: (cfg.formFilterColumns || []).filter((x) => x != uniqueName),
      filters: _.omit(cfg.filters || [], uniqueName),
    }));
  }
}
