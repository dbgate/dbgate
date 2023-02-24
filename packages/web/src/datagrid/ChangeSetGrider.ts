import { ChangeSet, MacroDefinition, MacroSelectedCell, runMacroOnRow } from 'dbgate-datalib';

import {
  changeSetContainsChanges,
  changeSetInsertNewRow,
  createChangeSet,
  deleteChangeSetRows,
  findExistingChangeSetItem,
  getChangeSetInsertedRows,
  GridDisplay,
  revertChangeSetRowChanges,
  setChangeSetValue,
  setChangeSetRowData,
  compileMacroFunction,
  runMacroOnValue,
  changeSetInsertDocuments,
} from 'dbgate-datalib';
import Grider from './Grider';
import type { GriderRowStatus } from './Grider';
import _ from 'lodash';

function getRowFromItem(row, matchedChangeSetItem) {
  return matchedChangeSetItem.document
    ? {
        ...matchedChangeSetItem.document,
        ...matchedChangeSetItem.fields,
      }
    : {
        ...row,
        ...matchedChangeSetItem.fields,
      };
}
export default class ChangeSetGrider extends Grider {
  public insertedRows: any[];
  public changeSet: ChangeSet;
  public setChangeSet: Function;
  private rowCacheIndexes: Set<number>;
  private rowDataCache;
  private rowStatusCache;
  private rowDefinitionsCache;
  private batchChangeSet: ChangeSet;
  private _errors = [];
  private compiledMacroFunc;

  constructor(
    public sourceRows: any[],
    public changeSetState,
    public dispatchChangeSet,
    public display: GridDisplay,
    public macro: MacroDefinition = null,
    public macroArgs: {} = {},
    public selectedCells: MacroSelectedCell[] = [],
    public useRowIndexInsteaOfCondition: boolean = false
  ) {
    super();
    this.changeSet = changeSetState && changeSetState.value;
    this.insertedRows = getChangeSetInsertedRows(this.changeSet, display?.baseTableOrSimilar);
    this.setChangeSet = value => dispatchChangeSet({ type: 'set', value });
    this.rowCacheIndexes = new Set();
    this.rowDataCache = {};
    this.rowStatusCache = {};
    this.rowDefinitionsCache = {};
    this.batchChangeSet = null;
    this.compiledMacroFunc = compileMacroFunction(macro, this._errors);

    // console.log('changeSet', this.changeSet);
  }

  get errors() {
    return this._errors;
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
    const rowDefinition = this.display?.getChangeSetRow(
      row,
      insertedRowIndex,
      this.useRowIndexInsteaOfCondition && index < this.sourceRows.length ? index : null,
      this.useRowIndexInsteaOfCondition
    );
    const [matchedField, matchedChangeSetItem] = findExistingChangeSetItem(this.changeSet, rowDefinition);
    let rowUpdated = matchedChangeSetItem
      ? getRowFromItem(row, matchedChangeSetItem)
      : this.compiledMacroFunc
      ? { ...row }
      : row;
    let status = 'regular';
    if (matchedChangeSetItem && matchedField == 'updates') status = 'updated';
    if (matchedField == 'deletes') status = 'deleted';
    if (insertedRowIndex != null) status = 'inserted';
    const rowStatus = {
      status,
      modifiedFields:
        matchedChangeSetItem && matchedChangeSetItem.fields ? new Set(Object.keys(matchedChangeSetItem.fields)) : null,
    };

    if (this.compiledMacroFunc) {
      if (this.macro?.type == 'transformValue') {
        for (const cell of this.selectedCells) {
          if (cell.row != index) continue;
          const newValue = runMacroOnValue(
            this.compiledMacroFunc,
            this.macroArgs,
            rowUpdated[cell.column],
            index,
            rowUpdated,
            cell.column,
            this._errors
          );
          rowUpdated[cell.column] = newValue;
        }
      }
      if (this.macro?.type == 'transformRow') {
        if (this.selectedCells.find(x => x.row == index)) {
          rowUpdated = runMacroOnRow(
            this.compiledMacroFunc,
            this.macroArgs,
            index,
            rowUpdated,
            _.uniq(this.selectedCells.map(x => x.column)),
            this._errors
          );
        }
      }
    }

    this.rowDataCache[index] = rowUpdated;
    this.rowStatusCache[index] = rowStatus;
    this.rowDefinitionsCache[index] = rowDefinition;
    this.rowCacheIndexes.add(index);
  }

  get editable() {
    return this.display.editable;
  }

  get canInsert() {
    return this.useRowIndexInsteaOfCondition || !!this.display.baseTableOrCollection;
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
    const definition = this.display.getChangeSetField(
      row,
      uniqueName,
      this.getInsertedRowIndex(index),
      this.useRowIndexInsteaOfCondition && index < this.sourceRows.length ? index : null,
      this.useRowIndexInsteaOfCondition
    );
    this.applyModification(chs => setChangeSetValue(chs, definition, value));
  }

  setRowData(index: number, document: any) {
    const row = this.getRowSource(index);
    const definition = this.display.getChangeSetRow(
      row,
      this.getInsertedRowIndex(index),
      this.useRowIndexInsteaOfCondition && index < this.sourceRows.length ? index : null
    );
    this.applyModification(chs => setChangeSetRowData(chs, definition, document));
  }

  deleteRow(index: number) {
    this.requireRowCache(index);
    this.applyModification(chs => deleteChangeSetRows(chs, this.rowDefinitionsCache[index]));
  }

  get rowCountInUpdate() {
    if (this.batchChangeSet) {
      const newRows = getChangeSetInsertedRows(this.batchChangeSet, this.display.baseTableOrSimilar);
      return this.sourceRows.length + newRows.length;
    } else {
      return this.rowCount;
    }
  }

  insertRow(): number {
    const res = this.rowCountInUpdate;
    this.applyModification(chs => changeSetInsertNewRow(chs, this.display.baseTableOrSimilar));
    return res;
  }

  insertDocuments(documents: any[]): number {
    const res = this.rowCountInUpdate;
    this.applyModification(chs => changeSetInsertDocuments(chs, documents, this.display.baseTableOrSimilar));
    return res;
  }

  beginUpdate() {
    this.batchChangeSet = this.changeSet;
  }
  endUpdate() {
    this.setChangeSet(this.batchChangeSet);
    this.batchChangeSet = null;
  }

  revertRowChanges(index: number) {
    this.requireRowCache(index);
    this.applyModification(chs => revertChangeSetRowChanges(chs, this.rowDefinitionsCache[index]));
  }
  revertAllChanges() {
    this.applyModification(chs => createChangeSet());
  }
  undo() {
    this.dispatchChangeSet({ type: 'undo' });
  }
  redo() {
    this.dispatchChangeSet({ type: 'redo' });
  }
  get canUndo() {
    return this.changeSetState?.canUndo;
  }
  get canRedo() {
    return this.changeSetState?.canRedo;
  }
  get containsChanges() {
    return changeSetContainsChanges(this.changeSet);
  }
  get disableLoadNextPage() {
    return this.insertedRows.length > 0;
  }

  // static factory({ sourceRows, changeSetState, dispatchChangeSet, display }): ChangeSetGrider {
  //   return new ChangeSetGrider(sourceRows, changeSetState, dispatchChangeSet, display);
  // }
  // static factoryDeps({ sourceRows, changeSetState, dispatchChangeSet, display }) {
  //   return [sourceRows, changeSetState ? changeSetState.value : null, dispatchChangeSet, display];
  // }
}
