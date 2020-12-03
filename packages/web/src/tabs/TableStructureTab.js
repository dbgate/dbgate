import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';
import ObjectListControl from '../utility/ObjectListControl';
import { TableColumn } from '../utility/TableControl';
import { useTableInfo, useDbCore } from '../utility/metadataLoaders';
import useTheme from '../theme/useTheme';
import ColumnLabel from '../datagrid/ColumnLabel';
import { FontIcon } from '../icons';

const WhitePage = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) => props.theme.main_background};
  overflow: auto;
`;

const IconTextSpan = styled.span`
  white-space: nowrap;
`;

function getConstraintIcon(data) {
  if (data.constraintType == 'primaryKey') return 'img primary-key';
  if (data.constraintType == 'foreignKey') return 'img foreign-key';
  return null;
}

function ConstraintLabel({ data }) {
  const icon = getConstraintIcon(data);
  return (
    <IconTextSpan>
      <FontIcon icon={icon} /> {data.constraintName}
    </IconTextSpan>
  );
}

export default function TableStructureTab({ conid, database, schemaName, pureName, objectTypeField = 'tables' }) {
  const theme = useTheme();
  const tableInfo = useDbCore({ conid, database, schemaName, pureName, objectTypeField });
  if (!tableInfo) return null;
  const { columns, primaryKey, foreignKeys, dependencies } = tableInfo;
  return (
    <WhitePage theme={theme}>
      <ObjectListControl
        collection={columns.map((x, index) => ({ ...x, ordinal: index + 1 }))}
        NameComponent={({ data }) => <ColumnLabel {...data} forceIcon />}
        // makeAppObj={columnAppObject}
        title="Columns"
      >
        <TableColumn
          fieldName="notNull"
          header="Not NULL"
          sortable={true}
          formatter={(row) => (row.notNull ? 'YES' : 'NO')}
        />
        <TableColumn fieldName="dataType" header="Data Type" sortable={true} />
        <TableColumn fieldName="defaultValue" header="Default value" sortable={true} />
        <TableColumn
          fieldName="isSparse"
          header="Is Sparse"
          sortable={true}
          formatter={(row) => (row.isSparse ? 'YES' : 'NO')}
        />
        <TableColumn fieldName="computedExpression" header="Computed Expression" sortable={true} />
        <TableColumn
          fieldName="isPersisted"
          header="Is Persisted"
          sortable={true}
          formatter={(row) => (row.isPersisted ? 'YES' : 'NO')}
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

      <ObjectListControl collection={_.compact([primaryKey])} NameComponent={ConstraintLabel} title="Primary key">
        <TableColumn
          fieldName="columns"
          header="Columns"
          formatter={(row) => row.columns.map((x) => x.columnName).join(', ')}
        />
      </ObjectListControl>

      <ObjectListControl collection={foreignKeys} NameComponent={ConstraintLabel} title="Foreign keys">
        <TableColumn
          fieldName="baseColumns"
          header="Base columns"
          formatter={(row) => row.columns.map((x) => x.columnName).join(', ')}
        />
        <TableColumn fieldName="refTable" header="Referenced table" formatter={(row) => row.refTableName} />
        <TableColumn
          fieldName="refColumns"
          header="Referenced columns"
          formatter={(row) => row.columns.map((x) => x.refColumnName).join(', ')}
        />
        <TableColumn fieldName="updateAction" header="ON UPDATE" />
        <TableColumn fieldName="deleteAction" header="ON DELETE" />
      </ObjectListControl>

      <ObjectListControl collection={dependencies} NameComponent={ConstraintLabel} title="Dependencies">
        <TableColumn
          fieldName="baseColumns"
          header="Base columns"
          formatter={(row) => row.columns.map((x) => x.columnName).join(', ')}
        />
        <TableColumn fieldName="baseTable" header="Base table" formatter={(row) => row.pureName} />
        <TableColumn
          fieldName="refColumns"
          header="Referenced columns"
          formatter={(row) => row.columns.map((x) => x.refColumnName).join(', ')}
        />
        <TableColumn fieldName="updateAction" header="ON UPDATE" />
        <TableColumn fieldName="deleteAction" header="ON DELETE" />
      </ObjectListControl>
    </WhitePage>
  );
}
