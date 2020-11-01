import { FreeTableModel, MacroDefinition, MacroSelectedCell, runMacro } from '@dbgate/datalib';
import Grider, { GriderRowStatus } from '../datagrid/Grider';

export default class MacroPreviewGrider extends Grider {
  model: FreeTableModel;
  _errors: string[] = [];
  constructor(model: FreeTableModel, macro: MacroDefinition, macroArgs: {}, selectedCells: MacroSelectedCell[]) {
    super();
    this.model = runMacro(macro, macroArgs, model, true, selectedCells, this._errors);
  }

  get errors() {
    return this._errors;
  }

  getRowStatus(index): GriderRowStatus {
    const row = this.model.rows[index];
    return {
      status: (row && row.__rowStatus) || 'regular',
      modifiedFields: row ? row.__modifiedFields : null,
    };
  }

  getRowData(index: any) {
    return this.model.rows[index];
  }
  get rowCount() {
    return this.model.rows.length;
  }
}
