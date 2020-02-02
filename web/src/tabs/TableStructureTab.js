import React from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';
import ObjectListControl from '../utility/ObjectListControl';
import { TableColumn } from '../utility/TableControl';

const WhitePage = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: white;
`;

export default function TableStructureTab({ conid, database, schemaName, pureName }) {
  /** @type {import('@dbgate/lib').TableInfo} */
  const tableInfo = useFetch({
    url: 'tables/table-info',
    params: { conid, database, schemaName, pureName },
  });
  if (!tableInfo) return null;
  return (
    <WhitePage>
      <ObjectListControl
        collection={tableInfo.columns.map((x, index) => ({ ...x, ordinal: index + 1 }))}
        title="Columns"
      >
        <TableColumn
          fieldName="notNull"
          header="Not NULL"
          sortable={true}
          formatter={row => (row.notNull ? 'YES' : 'NO')}
        />
        <TableColumn fieldName="dataType" header="Data Type" sortable={true} />
        <TableColumn fieldName="defaultValue" header="Default value" sortable={true} />
        <TableColumn
          fieldName="isSparse"
          header="Is Sparse"
          sortable={true}
          formatter={row => (row.isSparse ? 'YES' : 'NO')}
        />
        <TableColumn fieldName="computedExpression" header="Computed Expression" sortable={true} />
        <TableColumn
          fieldName="isPersisted"
          header="Is Persisted"
          sortable={true}
          formatter={row => (row.isPersisted ? 'YES' : 'NO')}
        />
        {/* {_.includes(dbCaps.columnListOptionalColumns, 'referencedTableNamesFormatted') && (
          <TableColumn fieldName="referencedTableNamesFormatted" header="References" sortable={true} />
        )}
        <TableColumn
          fieldName="actions"
          header=""
          formatter={row => (
            <span>
              <Link
                linkElementId={encodeHtmlId(`button_delete_column_${row.column.name}`)}
                onClick={() => this.deleteColumn(row)}
              >
                Delete
              </Link>{' '}
              |{' '}
              <Link
                linkElementId={encodeHtmlId(`button_edit_column__${row.column.name}`)}
                onClick={() => this.editColumn(row)}
              >
                Edit
              </Link>
            </span>
          )}
        /> */}
      </ObjectListControl>
    </WhitePage>
  );
}
