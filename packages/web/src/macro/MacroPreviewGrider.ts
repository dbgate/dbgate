import type { FreeTableModel, MacroDefinition, MacroSelectedCell } from 'dbgate-datalib';
import { runMacro } from 'dbgate-datalib';
import Grider from '../datagrid/Grider';
import type { GriderRowStatus } from '../datagrid/Grider';
import _ from 'lodash';

function convertToSet(row, field) {
  if (!row) return null;
  if (!row[field]) return null;
  if (_.isSet(row[field])) return row[field];
  return new Set(row[field]);
}

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
      modifiedFields: convertToSet(row, '__modifiedFields'),
      insertedFields: convertToSet(row, '__insertedFields'),
      deletedFields: convertToSet(row, '__deletedFields'),
    };
  }

  getRowData(index: any) {
    return this.model.rows[index];
  }
  get rowCount() {
    return this.model.rows.length;
  }
}
