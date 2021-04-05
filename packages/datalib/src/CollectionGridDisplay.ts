import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc, DisplayColumn } from './GridDisplay';
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
  let res = `${path[0]}`;
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
    this.editable = true;
    this.supportsReload = true;
    this.isDynamicStructure = true;
    this.changeSetKeyFields = ['_id'];
    this.baseCollection = collection;
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

  getColumnsForObject(basePath, obj, res: any[]) {
    for (const name of getObjectKeys(obj)) {
      const uniqueName = [...basePath, name].join('.');
      let column = res.find(x => x.uniqueName == uniqueName);
      if (!column) {
        column = this.getDisplayColumn(basePath, name);
        if (basePath.length > 0) {
          const lastIndex1 = _.findLastIndex(res, x => x.parentHeaderText.startsWith(column.parentHeaderText));
          const lastIndex2 = _.findLastIndex(res, x => x.headerText == column.parentHeaderText);
          // console.log(uniqueName, lastIndex1, lastIndex2);
          if (lastIndex1 >= 0) res.splice(lastIndex1 + 1, 0, column);
          else if (lastIndex2 >= 0) res.splice(lastIndex2 + 1, 0, column);
          else res.push(column);
        } else {
          res.push(column);
        }
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
      parentHeaderText: createHeaderText(basePath),
      filterType: 'mongo',
      pureName: this.collection.pureName,
      schemaName: this.collection.schemaName,
    };
  }
}
