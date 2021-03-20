import {
  ChangeSet,
  changeSetContainsChanges,
  changeSetInsertNewRow,
  createChangeSet,
  deleteChangeSetRows,
  findExistingChangeSetItem,
  getChangeSetInsertedRows,
  TableFormViewDisplay,
  revertChangeSetRowChanges,
  setChangeSetValue,
  ChangeSetRowDefinition,
} from 'dbgate-datalib';
import Former from './Former';

export default class ChangeSetFormer extends Former {
  public changeSet: ChangeSet;
  public setChangeSet: Function;
  private batchChangeSet: ChangeSet;
  public rowDefinition: ChangeSetRowDefinition;
  public rowStatus;
  public rowData: {};

  constructor(
    public sourceRow: any,
    public changeSetState,
    public dispatchChangeSet,
    public display: TableFormViewDisplay
  ) {
    super();
    this.changeSet = changeSetState && changeSetState.value;
    this.setChangeSet = value => dispatchChangeSet({ type: 'set', value });
    this.batchChangeSet = null;
    this.rowDefinition = display.getChangeSetRow(sourceRow);
    const [matchedField, matchedChangeSetItem] = findExistingChangeSetItem(this.changeSet, this.rowDefinition);
    this.rowData = matchedChangeSetItem ? { ...sourceRow, ...matchedChangeSetItem.fields } : sourceRow;
    let status = 'regular';
    if (matchedChangeSetItem && matchedField == 'updates') status = 'updated';
    if (matchedField == 'deletes') status = 'deleted';
    this.rowStatus = {
      status,
      modifiedFields:
        matchedChangeSetItem && matchedChangeSetItem.fields ? new Set(Object.keys(matchedChangeSetItem.fields)) : null,
    };
  }

  applyModification(changeSetReducer) {
    if (this.batchChangeSet) {
      this.batchChangeSet = changeSetReducer(this.batchChangeSet);
    } else {
      this.setChangeSet(changeSetReducer(this.changeSet));
    }
  }

  setCellValue(uniqueName: string, value: any) {
    const row = this.sourceRow;
    const definition = this.display.getChangeSetField(row, uniqueName);
    this.applyModification(chs => setChangeSetValue(chs, definition, value));
  }

  deleteRow(index: number) {
    this.applyModification(chs => deleteChangeSetRows(chs, this.rowDefinition));
  }

  beginUpdate() {
    this.batchChangeSet = this.changeSet;
  }
  endUpdate() {
    this.setChangeSet(this.batchChangeSet);
    this.batchChangeSet = null;
  }

  revertRowChanges() {
    this.applyModification(chs => revertChangeSetRowChanges(chs, this.rowDefinition));
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
    return this.changeSetState.canUndo;
  }
  get canRedo() {
    return this.changeSetState.canRedo;
  }
  get containsChanges() {
    return changeSetContainsChanges(this.changeSet);
  }
}
