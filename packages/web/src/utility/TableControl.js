import React from 'react';
import _ from 'lodash';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';

const Table = styled.table`
  border-collapse: collapse;
  width: 100%;
`;
const TableHead = styled.thead``;
const TableBody = styled.tbody``;
const TableHeaderRow = styled.tr``;
const TableBodyRow = styled.tr``;
const TableHeaderCell = styled.td`
  border: 1px solid #e8eef4;
  background-color: #e8eef4;
  padding: 5px;
`;
const TableBodyCell = styled.td`
  border: 1px solid #e8eef4;
  padding: 5px;
`;

export function TableColumn({ fieldName, header, sortable = false, formatter = undefined }) {
  return <></>;
}

function format(row, col) {
  const { formatter, fieldName } = col;
  if (formatter) return formatter(row);
  return row[fieldName];
}

export default function TableControl({ rows = [], children }) {
  console.log('children', children);

  const columns = (children instanceof Array ? _.flatten(children) : [children])
    .filter(child => child && child.props && child.props.fieldName)
    .map(child => child.props);

  return (
    <Table>
      <TableHead>
        <TableHeaderRow>
          {columns.map(x => (
            <TableHeaderCell key={x.fieldName}>{x.header}</TableHeaderCell>
          ))}
        </TableHeaderRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <TableBodyRow key={index}>
            {columns.map(col => (
              <TableBodyCell key={col.fieldName}>{format(row, col)}</TableBodyCell>
            ))}
          </TableBodyRow>
        ))}
      </TableBody>
    </Table>
  );
}
