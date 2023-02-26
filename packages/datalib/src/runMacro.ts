import _ from 'lodash';
import uuidv1 from 'uuid/v1';
import uuidv4 from 'uuid/v4';
import moment from 'moment';
import { MacroDefinition, MacroSelectedCell } from './MacroDefinition';
import { ChangeSet, setChangeSetValue, setChangeSetRowData } from './ChangeSet';
import { GridDisplay } from './GridDisplay';

const getMacroFunction = {
  transformValue: code => `
(value, args, modules, rowIndex, row, columnName) => {
    ${code}
}
`,
  transformRow: code => `
(row, args, modules, rowIndex, columns) => {
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

export function compileMacroFunction(macro: MacroDefinition, errors = []) {
  if (!macro) return null;
  let func;
  try {
    func = eval(getMacroFunction[macro.type](macro.code));
    return func;
  } catch (err) {
    errors.push(`Error compiling macro ${macro.name}: ${err.message}`);
    return null;
  }
}

export function runMacroOnValue(compiledFunc, macroArgs, value, rowIndex: number, row, column: string, errors = []) {
  if (!compiledFunc) return value;
  try {
    const res = compiledFunc(value, macroArgs, modules, rowIndex, row, column);
    return res;
  } catch (err) {
    errors.push(`Error processing column ${column} on row ${rowIndex}: ${err.message}`);
    return value;
  }
}

export function runMacroOnRow(compiledFunc, macroArgs, rowIndex: number, row: any, columns: string[], errors = []) {
  if (!compiledFunc) return row;
  try {
    const res = compiledFunc(row, macroArgs, modules, rowIndex, columns);
    return res;
  } catch (err) {
    errors.push(`Error processing row ${rowIndex}: ${err.message}`);
    return row;
  }
}

export function runMacroOnChangeSet(
  macro: MacroDefinition,
  macroArgs: {},
  selectedCells: MacroSelectedCell[],
  changeSet: ChangeSet,
  display: GridDisplay,
  useRowIndexInsteaOfCondition: boolean
): ChangeSet {
  const errors = [];
  const compiledMacroFunc = compileMacroFunction(macro, errors);
  if (!compiledMacroFunc) return null;

  if (macro.type == 'transformValue') {
    let res = changeSet;
    for (const cell of selectedCells) {
      const definition = display.getChangeSetField(
        cell.rowData,
        cell.column,
        undefined,
        useRowIndexInsteaOfCondition ? cell.row : undefined,
        useRowIndexInsteaOfCondition
      );
      const macroResult = runMacroOnValue(
        compiledMacroFunc,
        macroArgs,
        cell.value,
        cell.row,
        cell.rowData,
        cell.column,
        errors
      );
      res = setChangeSetValue(res, definition, macroResult);
    }
    return res;
  }
  if (macro.type == 'transformRow') {
    let res = changeSet;
    const rowIndexes = _.uniq(selectedCells.map(x => x.row));
    for (const index of rowIndexes) {
      const rowData = selectedCells.find(x => x.row == index)?.rowData;
      const columns = _.uniq(selectedCells.map(x => x.column));
      const definition = display.getChangeSetRow(rowData, null, index, true);
      const newRow = runMacroOnRow(compiledMacroFunc, macroArgs, index, rowData, columns);
      res = setChangeSetRowData(res, definition, newRow);
    }
    return res;
  }
}
