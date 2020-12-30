import React from 'react';
import DataFilterControl from '../datagrid/DataFilterControl';
import { CheckboxField, SelectField, TextField } from '../utility/inputs';
import TableControl, { TableColumn } from '../utility/TableControl';
import InlineButton from '../widgets/InlineButton';
import { findDesignerFilterType } from './designerTools';

function getTableDisplayName(column, tables) {
  const table = tables.find((x) => x.designerId == column.designerId);
  if (table) return table.alias || table.pureName;
  return '';
}

export default function QueryDesignColumns({ value, onChange }) {
  const { columns, tables } = value || {};

  const changeColumn = React.useCallback(
    (col) => {
      onChange((current) => ({
        ...current,
        columns: (current.columns || []).map((x) =>
          x.designerId == col.designerId && x.columnName == col.columnName ? col : x
        ),
      }));
    },
    [onChange]
  );

  const removeColumn = React.useCallback(
    (col) => {
      onChange((current) => ({
        ...current,
        columns: (current.columns || []).filter(
          (x) => x.designerId != col.designerId || x.columnName != col.columnName
        ),
      }));
    },
    [onChange]
  );

  const hasGroupedColumn = !!(columns || []).find((x) => x.isGrouped);

  return (
    <TableControl rows={columns || []}>
      <TableColumn fieldName="columnName" header="Column/Expression" />
      <TableColumn fieldName="tableDisplayName" header="Table" formatter={(row) => getTableDisplayName(row, tables)} />
      <TableColumn
        fieldName="isOutput"
        header="Output"
        formatter={(row) => (
          <CheckboxField
            checked={row.isOutput}
            onChange={(e) => {
              if (e.target.checked) changeColumn({ ...row, isOutput: true });
              else changeColumn({ ...row, isOutput: false });
            }}
          />
        )}
      />
      <TableColumn
        fieldName="alias"
        header="Alias"
        formatter={(row) => (
          <TextField
            value={row.alias}
            onChange={(e) => {
              changeColumn({ ...row, alias: e.target.value });
            }}
          />
        )}
      />

      <TableColumn
        fieldName="isGrouped"
        header="Group by"
        formatter={(row) => (
          <CheckboxField
            checked={row.isGrouped}
            onChange={(e) => {
              if (e.target.checked) changeColumn({ ...row, isGrouped: true });
              else changeColumn({ ...row, isGrouped: false });
            }}
          />
        )}
      />
      <TableColumn
        fieldName="aggregate"
        header="Aggregate"
        formatter={(row) =>
          !row.isGrouped && (
            <SelectField
              value={row.aggregate}
              onChange={(e) => {
                changeColumn({ ...row, aggregate: e.target.value });
              }}
            >
              <option value="---">---</option>
              <option value="MIN">MIN</option>
              <option value="MAX">MAX</option>
              <option value="COUNT">COUNT</option>
              <option value="COUNT DISTINCT">COUNT DISTINCT</option>
              <option value="SUM">SUM</option>
              <option value="AVG">AVG</option>
            </SelectField>
          )
        }
      />
      <TableColumn
        fieldName="sortOrder"
        header="Sort order"
        formatter={(row) => (
          <SelectField
            value={row.sortOrder}
            onChange={(e) => {
              changeColumn({ ...row, sortOrder: parseInt(e.target.value) });
            }}
          >
            <option value="0">---</option>
            <option value="1">1st, ascending</option>
            <option value="-1">1st, descending</option>
            <option value="2">2nd, ascending</option>
            <option value="-2">2nd, descending</option>
            <option value="3">3rd, ascending</option>
            <option value="-3">3rd, descending</option>,
          </SelectField>
        )}
      />
      <TableColumn
        fieldName="filter"
        header="Filter"
        formatter={(row) => (
          <DataFilterControl
            filterType={findDesignerFilterType(row, value)}
            filter={row.filter}
            setFilter={(filter) => {
              changeColumn({ ...row, filter });
            }}
          />
        )}
      />
      {hasGroupedColumn && (
        <TableColumn
          fieldName="groupFilter"
          header="Group filter"
          formatter={(row) => (
            <DataFilterControl
              filterType={findDesignerFilterType(row, value)}
              filter={row.groupFilter}
              setFilter={(groupFilter) => {
                changeColumn({ ...row, groupFilter });
              }}
            />
          )}
        />
      )}
      <TableColumn
        fieldName="actions"
        header=""
        formatter={(row) => (
          <>
            <InlineButton onClick={() => removeColumn(row)}>Remove</InlineButton>
          </>
        )}
      />
    </TableControl>
  );
}
