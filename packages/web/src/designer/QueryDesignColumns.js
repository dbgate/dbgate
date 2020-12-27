import React from 'react';
import { CheckboxField } from '../utility/inputs';
import TableControl, { TableColumn } from '../utility/TableControl';

export default function QueryDesignColumns({ value, onChange }) {
  const { columns } = value || {};
  console.log('QueryDesignColumns', value);

  const changeColumn = React.useCallback(
    (col) => {
      const newValue = {
        ...value,
        columns: (value.columns || []).map((x) =>
          x.designerId == col.designerId && x.columnName == col.columnName ? col : x
        ),
      };
      onChange(newValue);
    },
    [onChange, value]
  );

  return (
    <TableControl rows={columns || []}>
      <TableColumn fieldName="columnName" header="Column/Expression" />
      <TableColumn fieldName="tableDisplayName" header="Table" />
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
      {/* <TableColumn fieldName="queryDesignInfo.alias" editor="textbox" header="Alias" />
      <TableColumn fieldName="queryDesignInfo.isGrouped" editor="checkbox" header="Group by" />
      <TableColumn
        fieldName="queryDesignInfo.aggregate"
        editor="combobox"
        header="Aggregate"
        comboValues={['---', 'MIN', 'MAX', 'COUNT', 'COUNT DISTINCT', 'SUM', 'AVG']}
      />
      <TableColumn
        fieldName="queryDesignInfo.sortOrder"
        header="Sort order"
        editor="combobox"
        comboValues={sortComboValues}
      />
      <TableColumn fieldName="filter" header="Filter" editor="filterbox" getFilterType={this.getFilterType} /> */}
    </TableControl>
  );
}
