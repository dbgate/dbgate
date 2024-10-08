import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc } from './GridDisplay';
import { GridConfig, GridCache } from './GridConfig';
import { analyseCollectionDisplayColumns } from './CollectionGridDisplay';
import { evalFilterBehaviour } from 'dbgate-tools';
import { EngineDriver } from 'dbgate-types';

export class JslGridDisplay extends GridDisplay {
  constructor(
    jslid,
    structure,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    rows: any,
    isDynamicStructure: boolean,
    supportsReload: boolean,
    editable: boolean = false,
    driver: EngineDriver = null
  ) {
    super(config, setConfig, cache, setCache, driver);

    this.filterable = true;
    this.sortable = true;
    this.supportsReload = supportsReload;
    this.isDynamicStructure = isDynamicStructure;
    this.filterBehaviourOverride = evalFilterBehaviour;
    this.editable = editable;
    this.editableStructure = editable ? structure : null;

    if (structure?.columns) {
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

    if (structure?.__isDynamicStructure) {
      this.columns = analyseCollectionDisplayColumns(rows, this);
    }

    if (!this.columns) this.columns = [];

    this.formColumns = this.columns;
  }
}
