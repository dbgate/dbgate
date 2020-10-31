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
        const columnSet = new Set(selectedRow.map((item) => item.column));
        const changedValues = [];
        const res = _.mapValues(row, (value, key) => {
          if (columnSet.has(key)) {
            const newValue = func(value, macroArgs, modules, rowIndex, row, key);
            if (preview && newValue != value) changedValues.push(key);
            return newValue;
          } else {
            return value;
          }
        });
        if (changedValues.length > 0) {
          return {
            ...res,
            __changedValues: new Set(changedValues),
          };
        }
        return res;
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
