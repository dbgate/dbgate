import { FreeTableModel } from './FreeTableModel';
import _ from 'lodash';
import uuidv1 from 'uuid/v1';
import uuidv4 from 'uuid/v4';
import moment from 'moment';
import { MacroDefinition, MacroSelectedCell } from './MacroDefinition';

const getMacroFunction = {
  transformValue: (code) => `
(value, args, modules, rowIndex, row, columnName) => {
    ${code}
}
`,
};

const modules = {
  lodash: _,
  uuidv1,
  uuidv4,
  moment,
};

export function runMacro(
  macro: MacroDefinition,
  macroArgs: {},
  data: FreeTableModel,
  preview: boolean,
  selectedCells: MacroSelectedCell[]
): FreeTableModel {
  const func = eval(getMacroFunction[macro.type](macro.code));
  if (macro.type == 'transformValue') {
    const selectedRows = _.groupBy(selectedCells, 'row');
    const rows = data.rows.map((row, rowIndex) => {
      const selectedRow = selectedRows[rowIndex];
      if (selectedRow) {
        const modifiedFields = [];
        let res = null;
        for (const cell of selectedRow) {
          const { column } = cell;
          const oldValue = row[column];
          const newValue = func(oldValue, macroArgs, modules, rowIndex, row, column);
          if (newValue != oldValue) {
            if (res == null) {
              res = { ...row };
            }
            res[column] = newValue;
            if (preview) modifiedFields.push(column);
          }
        }
        if (res) {
          if (modifiedFields.length > 0) {
            return {
              ...res,
              __modifiedFields: new Set(modifiedFields),
            };
          }
          return res;
        }
        return row;
      } else {
        return row;
      }
    });

    return {
      structure: data.structure,
      rows,
    };
  }
  return data;
}
