import { FreeTableModel } from './FreeTableModel';
import _ from 'lodash';
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
        const changedValues = [];
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
            if (preview) changedValues.push(column);
          }
        }
        if (res) {
          if (changedValues.length > 0) {
            return {
              ...res,
              __changedValues: new Set(changedValues),
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
