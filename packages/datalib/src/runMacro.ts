import { FreeTableModel } from './FreeTableModel';
import _ from 'lodash';
import uuidv1 from 'uuid/v1';
import uuidv4 from 'uuid/v4';
import moment from 'moment';
import { MacroDefinition, MacroSelectedCell } from './MacroDefinition';
import { ChangeSet, setChangeSetValue } from './ChangeSet';
import { GridDisplay } from './GridDisplay';

const getMacroFunction = {
  transformValue: code => `
(value, args, modules, rowIndex, row, columnName) => {
    ${code}
}
`,
  transformRows: code => `
(rows, args, modules, selectedCells, cols, columns) => {
  ${code}
}
`,
  transformData: code => `
(rows, args, modules, selectedCells, cols, columns) => {
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

function runTramsformValue(
  func,
  macroArgs: {},
  data: FreeTableModel,
  preview: boolean,
  selectedCells: MacroSelectedCell[],
  errors: string[] = []
) {
  const selectedRows = _.groupBy(selectedCells, 'row');
  const rows = data.rows.map((row, rowIndex) => {
    const selectedRow = selectedRows[rowIndex];
    if (selectedRow) {
      const modifiedFields = [];
      let res = null;
      for (const cell of selectedRow) {
        const { column } = cell;
        const oldValue = row[column];
        let newValue = oldValue;
        try {
          newValue = func(oldValue, macroArgs, modules, rowIndex, row, column);
        } catch (err) {
          errors.push(`Error processing column ${column} on row ${rowIndex}: ${err.message}`);
        }
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

function removePreviewRowFlags(rows) {
  rows = rows.filter(row => row.__rowStatus != 'deleted');
  rows = rows.map(row => {
    if (row.__rowStatus || row.__modifiedFields || row.__insertedFields || row.__deletedFields)
      return _.omit(row, ['__rowStatus', '__modifiedFields', '__insertedFields', '__deletedFields']);
    return row;
  });
  return rows;
}

function runTramsformRows(
  func,
  macroArgs: {},
  data: FreeTableModel,
  preview: boolean,
  selectedCells: MacroSelectedCell[],
  errors: string[] = []
) {
  let rows = data.rows;
  try {
    rows = func(
      data.rows,
      macroArgs,
      modules,
      selectedCells,
      data.structure.columns.map(x => x.columnName),
      data.structure.columns
    );
    if (!preview) {
      rows = removePreviewRowFlags(rows);
    }
  } catch (err) {
    errors.push(`Error processing rows: ${err.message}`);
  }
  return {
    structure: data.structure,
    rows,
  };
}

function runTramsformData(
  func,
  macroArgs: {},
  data: FreeTableModel,
  preview: boolean,
  selectedCells: MacroSelectedCell[],
  errors: string[] = []
) {
  try {
    let { rows, columns, cols } = func(
      data.rows,
      macroArgs,
      modules,
      selectedCells,
      data.structure.columns.map(x => x.columnName),
      data.structure.columns
    );
    if (cols && !columns) {
      columns = cols.map(columnName => ({ columnName }));
    }
    columns = _.uniqBy(columns, 'columnName');
    if (!preview) {
      rows = removePreviewRowFlags(rows);
    }
    return {
      structure: { columns },
      rows,
    };
  } catch (err) {
    errors.push(`Error processing data: ${err.message}`);
  }
  return data;
}

export function runMacro(
  macro: MacroDefinition,
  macroArgs: {},
  data: FreeTableModel,
  preview: boolean,
  selectedCells: MacroSelectedCell[],
  errors: string[] = []
): FreeTableModel {
  let func;
  try {
    func = eval(getMacroFunction[macro.type](macro.code));
  } catch (err) {
    errors.push(`Error compiling macro ${macro.name}: ${err.message}`);
    return data;
  }
  if (macro.type == 'transformValue') {
    return runTramsformValue(func, macroArgs, data, preview, selectedCells, errors);
  }
  if (macro.type == 'transformRows') {
    return runTramsformRows(func, macroArgs, data, preview, selectedCells, errors);
  }
  if (macro.type == 'transformData') {
    // @ts-ignore
    return runTramsformData(func, macroArgs, data, preview, selectedCells, errors);
  }
  return data;
}

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

export function runMacroOnValue(compiledFunc, macroArgs, value, rowIndex, row, column, errors = []) {
  if (!compiledFunc) return value;
  try {
    const res = compiledFunc(value, macroArgs, modules, rowIndex, row, column);
    return res;
  } catch (err) {
    errors.push(`Error processing column ${column} on row ${rowIndex}: ${err.message}`);
    return value;
  }
}

export function runMacroOnChangeSet(
  macro: MacroDefinition,
  macroArgs: {},
  selectedCells: MacroSelectedCell[],
  changeSet: ChangeSet,
  display: GridDisplay
): ChangeSet {
  const errors = [];
  const compiledMacroFunc = compileMacroFunction(macro, errors);
  if (!compiledMacroFunc) return null;

  let res = changeSet;
  for (const cell of selectedCells) {
    const definition = display.getChangeSetField(cell.rowData, cell.column, undefined);
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
