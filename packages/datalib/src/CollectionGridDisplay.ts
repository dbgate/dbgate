import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, ChangeConfigFunc, DisplayColumn } from './GridDisplay';
import type { EngineDriver, ViewInfo, ColumnInfo, CollectionInfo } from 'dbgate-types';
import { GridConfig, GridCache } from './GridConfig';
import { mongoFilterBehaviour, standardFilterBehaviours } from 'dbgate-tools';

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

function getColumnsForObject(basePath, obj, res: any[], display) {
  for (const name of getObjectKeys(obj)) {
    const uniqueName = [...basePath, name].join('.');
    let column = res.find(x => x.uniqueName == uniqueName);
    if (!column) {
      column = getDisplayColumn(basePath, name, display);
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

    if (display.isExpandedColumn(column.uniqueName)) {
      getColumnsForObject([...basePath, name], obj[name], res, display);
    }
  }
}

function getDisplayColumn(basePath, columnName, display: CollectionGridDisplay) {
  const uniquePath = [...basePath, columnName];
  const uniqueName = uniquePath.join('.');
  return {
    columnName,
    headerText: createHeaderText(uniquePath),
    uniqueName,
    uniquePath,
    isStructured: true,
    parentHeaderText: createHeaderText(basePath),
    filterBehaviour: display?.driver?.getFilterBehaviour(null, standardFilterBehaviours) ?? mongoFilterBehaviour,
    pureName: display.collection?.pureName,
    schemaName: display.collection?.schemaName,

    isPartitionKey: !!display?.collection?.partitionKey?.find(x => x.columnName == uniqueName),
    isClusterKey: !!display?.collection?.clusterKey?.find(x => x.columnName == uniqueName),
    isUniqueKey: !!display?.collection?.uniqueKey?.find(x => x.columnName == uniqueName),
  };
}

export function analyseCollectionDisplayColumns(rows, display) {
  const res = [];
  const addedColumns = display?.config?.addedColumns;
  for (const row of rows || []) {
    getColumnsForObject([], row, res, display);
  }
  for (const added of addedColumns || []) {
    if (res.find(x => x.uniqueName == added)) continue;
    res.push(getDisplayColumn([], added, display));
  }
  return (
    res.map(col => ({
      ...col,
      isChecked: display.isColumnChecked(col),
    })) || []
  );
}

export class CollectionGridDisplay extends GridDisplay {
  constructor(
    public collection: CollectionInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    loadedRows,
    changeSet,
    readOnly = false
  ) {
    super(config, setConfig, cache, setCache, driver);
    const changedDocs = _.compact(changeSet.updates.map(chs => chs.document));
    const insertedDocs = _.compact(changeSet.inserts.map(chs => chs.fields));
    this.columns = analyseCollectionDisplayColumns([...(loadedRows || []), ...changedDocs, ...insertedDocs], this);
    this.filterable = true;
    this.sortable = true;
    this.editable = !readOnly && collection?.uniqueKey?.length > 0;
    this.supportsReload = true;
    this.isDynamicStructure = true;
    this.changeSetKeyFields = collection?.uniqueKey?.map(x => x.columnName);
    this.baseCollection = collection;
  }
}
