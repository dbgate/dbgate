import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';
import theme from '../theme';
import useFetch from '../utility/useFetch';
import ObjectListControl from '../utility/ObjectListControl';
import { TableColumn } from '../utility/TableControl';
import columnAppObject from '../appobj/columnAppObject';
import constraintAppObject from '../appobj/constraintAppObject';
import useTableInfo from '../utility/useTableInfo';

const WhitePage = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: white;
`;

export default function TableStructureTab({ conid, database, schemaName, pureName }) {
  const tableInfo = useTableInfo({ conid, database, schemaName, pureName });
  if (!tableInfo) return null;
  const { columns, primaryKey, foreignKeys, dependencies } = tableInfo;
  return (
    <WhitePage>
      <ObjectListControl
        collection={columns.map((x, index) => ({ ...x, ordinal: index + 1 }))}
        makeAppObj={columnAppObject}
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

      <ObjectListControl collection={_.compact([primaryKey])} makeAppObj={constraintAppObject} title="Primary key">
        <TableColumn
          fieldName="columns"
          header="Columns"
          formatter={row => row.columns.map(x => x.columnName).join(', ')}
        />
      </ObjectListControl>

      <ObjectListControl collection={foreignKeys} makeAppObj={constraintAppObject} title="Foreign keys">
        <TableColumn
          fieldName="baseColumns"
          header="Base columns"
          formatter={row => row.columns.map(x => x.columnName).join(', ')}
        />
        <TableColumn fieldName="refTable" header="Referenced table" formatter={row => row.refTableName} />
        <TableColumn
          fieldName="refColumns"
          header="Referenced columns"
          formatter={row => row.columns.map(x => x.refColumnName).join(', ')}
        />
        <TableColumn fieldName="updateAction" header="ON UPDATE" />
        <TableColumn fieldName="deleteAction" header="ON DELETE" />
      </ObjectListControl>

      <ObjectListControl collection={dependencies} makeAppObj={constraintAppObject} title="Dependencies">
        <TableColumn
          fieldName="baseColumns"
          header="Base columns"
          formatter={row => row.columns.map(x => x.columnName).join(', ')}
        />
        <TableColumn fieldName="baseTable" header="Base table" formatter={row => row.pureName} />
        <TableColumn
          fieldName="refColumns"
          header="Referenced columns"
          formatter={row => row.columns.map(x => x.refColumnName).join(', ')}
        />
        <TableColumn fieldName="updateAction" header="ON UPDATE" />
        <TableColumn fieldName="deleteAction" header="ON DELETE" />
      </ObjectListControl>
    </WhitePage>
  );
}
