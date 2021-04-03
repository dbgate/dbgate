import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc } from './GridDisplay';
import { EngineDriver, ViewInfo, ColumnInfo, CollectionInfo } from 'dbgate-types';
import { GridConfig, GridCache } from './GridConfig';

function getObjectKeys(obj) {
  if (_.isArray(obj)) {
    return Object.keys(obj)
      .slice(0, 10)
      .map(x => parseInt(x));
  }
  if (_.isPlainObject(obj)) {
    return Object.keys(obj);
  }
  return [];
}

function createHeaderText(path) {
  let res = path[0];
  for (let i = 1; i < path.length; i++) {
    const name = path[i];
    if (_.isNumber(name)) res += `[${name}]`;
    else res += `.${name}`;
  }
  return res;
}
export class CollectionGridDisplay extends GridDisplay {
  constructor(
    public collection: CollectionInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    loadedRows
  ) {
    super(config, setConfig, cache, setCache, driver);
    this.columns = this.getDisplayColumns(loadedRows || []);
    this.filterable = true;
    this.sortable = true;
    this.editable = false;
    this.supportsReload = true;
    this.isDynamicStructure = true;
  }

  getDisplayColumns(rows) {
    const res = [];
    for (const row of rows) {
      this.getColumnsForObject([], row, res);
    }
    return (
      res.map(col => ({
        ...col,
        isChecked: this.isColumnChecked(col),
      })) || []
    );
  }

  getColumnsForObject(basePath, obj, res) {
    for (const name of getObjectKeys(obj)) {
      let column = res.find(x => x.columnName == name);
      if (!column) {
        column = this.getDisplayColumn(basePath, name);
        res.push(column);
      }
      if (_.isPlainObject(obj[name]) || _.isArray(obj[name])) {
        column.isExpandable = true;
      }

      if (this.isExpandedColumn(column.uniqueName)) {
        this.getColumnsForObject([...basePath, name], obj[name], res);
      }
    }
  }

  getDisplayColumn(basePath, columnName) {
    const uniquePath = [...basePath, columnName];
    const uniqueName = uniquePath.join('.');
    return {
      columnName,
      headerText: createHeaderText(uniquePath),
      uniqueName,
      uniquePath,
      isStructured: true,
    };
  }
}
