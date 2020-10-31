import { FreeTableModel, MacroDefinition, MacroSelectedCell, runMacro } from '@dbgate/datalib';
import Grider from '../datagrid/Grider';

export default class MacroPreviewGrider extends Grider {
  model: FreeTableModel;
  constructor(model: FreeTableModel, macro: MacroDefinition, macroArgs: {}, selectedCells: MacroSelectedCell[]) {
    super();
    this.model = runMacro(macro, macroArgs, model, true, selectedCells);
  }

  getRowData(index: any) {
    return this.model.rows[index];
  }
  get rowCount() {
    return this.model.rows.length;
  }
}
