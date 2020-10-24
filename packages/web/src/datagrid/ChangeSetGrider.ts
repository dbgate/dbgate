import {
  ChangeSet,
  changeSetInsertNewRow,
  deleteChangeSetRows,
  findExistingChangeSetItem,
  getChangeSetInsertedRows,
  GridDisplay,
  setChangeSetValue,
} from '@dbgate/datalib';
import Grider, { GriderRowStatus } from './Grider';

export default class ChangeSetGrider extends Grider {
  public insertedRows: any[];
  public setChangeSet: Function;
  private rowCacheIndexes: Set<number>;
  private rowDataCache;
  private rowStatusCache;
  private rowDefinitionsCache;
  private batchChangeSet: ChangeSet;

  constructor(
    public sourceRows: any[],
    public changeSet: ChangeSet,
    public dispatchChangeSet,
    public display: GridDisplay
  ) {
    super();
    this.insertedRows = getChangeSetInsertedRows(changeSet, display.baseTable);
    this.setChangeSet = (value) => dispatchChangeSet({ type: 'set', value });
    this.rowCacheIndexes = new Set();
    this.rowDataCache = {};
    this.rowStatusCache = {};
    this.rowDefinitionsCache = {};
    this.batchChangeSet = null;
  }

  getRowSource(index: number) {
    if (index < this.sourceRows.length) return this.sourceRows[index];
    return null;
  }

  getInsertedRowIndex(index) {
    return index >= this.sourceRows.length ? index - this.sourceRows.length : null;
  }

  requireRowCache(index: number) {
    if (this.rowCacheIndexes.has(index)) return;
    const row = this.getRowSource(index);
    const insertedRowIndex = this.getInsertedRowIndex(index);
    const rowDefinition = this.display.getChangeSetRow(row, insertedRowIndex);
    const [matchedField, matchedChangeSetItem] = findExistingChangeSetItem(this.changeSet, rowDefinition);
    const rowUpdated = matchedChangeSetItem ? { ...row, ...matchedChangeSetItem.fields } : row;
    let status = 'regular';
    if (matchedChangeSetItem && matchedField == 'updates') status = 'updated';
    if (matchedField == 'deletes') status = 'deleted';
    if (insertedRowIndex != null) status = 'inserted';
    const rowStatus = {
      status,
      modifiedFields: new Set(matchedChangeSetItem ? Object.keys(matchedChangeSetItem.fields) : []),
    };
    this.rowDataCache[index] = rowUpdated;
    this.rowStatusCache[index] = rowStatus;
    this.rowDefinitionsCache[index] = rowDefinition;
    this.rowCacheIndexes.add(index);
  }

  getRowData(index: number) {
    this.requireRowCache(index);
    return this.rowDataCache[index];
  }

  getRowStatus(index): GriderRowStatus {
    this.requireRowCache(index);
    return this.rowStatusCache[index];
  }

  get rowCount() {
    return this.sourceRows.length + this.insertedRows.length;
  }

  applyModification(changeSetReducer) {
    if (this.batchChangeSet) {
      this.batchChangeSet = changeSetReducer(this.batchChangeSet);
    } else {
      this.setChangeSet(changeSetReducer(this.changeSet));
    }
  }

  setCellValue(index: number, uniqueName: string, value: any) {
    const row = this.getRowSource(index);
    const definition = this.display.getChangeSetField(row, uniqueName, this.getInsertedRowIndex(index));
    this.applyModification((chs) => setChangeSetValue(chs, definition, value));
  }

  deleteRow(index: number) {
    this.requireRowCache(index);
    this.applyModification((chs) => deleteChangeSetRows(chs, this.rowDefinitionsCache[index]));
  }

  insertRow(): number {
    this.applyModification((chs) => changeSetInsertNewRow(chs, this.display.baseTable));
    return this.rowCount;
  }

  beginUpdate() {
    this.batchChangeSet = this.changeSet;
  }
  endUpdate() {
    this.setChangeSet(this.batchChangeSet);
    this.batchChangeSet = null;
  }

  static factory({ sourceRows, changeSet, dispatchChangeSet, display }): ChangeSetGrider {
    return new ChangeSetGrider(sourceRows, changeSet, dispatchChangeSet, display);
  }
  static factoryDeps({ sourceRows, changeSet, dispatchChangeSet, display }) {
    return [sourceRows, changeSet, dispatchChangeSet, display];
  }
}
