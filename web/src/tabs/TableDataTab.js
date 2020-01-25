import React from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';

// const Table = styled.table`
//   position: absolute;
//   left:0;
//   top:0:
//   bottom:0;
//   right:0;
//   overflow: scroll;
// `;
// const TableHead = styled.thead`
//   // display: block;
//   // width: 300px;
// `;
// const TableBody = styled.tbody`
//   // display: block;
//   // overflow: auto;
//   // height: 100px;
// `;
// const TableHeaderRow = styled.tr`
//   height: 35px;
// `;
// const TableBodyRow = styled.tr`
//   height: 35px;
// `;
// const TableHeaderCell = styled.td`
//   font-weight: bold;
// `;
// const TableBodyCell = styled.td`
//   white-space: nowrap;
// `;

const Table = styled.div`
  overflow-x: scroll;
  width: 500px;
  position: absolute;
  left:0;
  top:0:
  bottom:0;
  right:0;
`;
const TableHead = styled.div`
  // display: block;
  // width: 300px;
  // width:700px;
`;
const TableBody = styled.div`
  // display: block;
  overflow-y: scroll;
  height: 200px;
`;
const TableHeaderRow = styled.div`
  display: flex;
  height: 35px;
`;
const TableBodyRow = styled.div`
  display: flex;
  height: 35px;
`;
const TableHeaderCell = styled.div`
  font-weight: bold;
  width: 160px;
  overflow: hidden;
`;
const TableBodyCell = styled.div`
  white-space: nowrap;
  width: 160px;
  overflow: hidden;
`;

export default function TableDataTab({ conid, database, schemaName, pureName }) {
  const data = useFetch({
    url: 'tables/table-data',
    params: {
      conid,
      database,
      schemaName,
      pureName,
    },
  });
  const { rows, columns } = data || {};
  if (!columns || !rows) return null;
  return (
    <Table>
      <TableHead>
        <TableHeaderRow>
          {columns.map(col => (
            <TableHeaderCell key={col.name} style={{ width: '60px' }}>
              {col.name}
            </TableHeaderCell>
          ))}
        </TableHeaderRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <TableBodyRow key={index}>
            {columns.map(col => (
              <TableBodyCell key={col.name} style={{ width: '60px' }}>
                {row[col.name]}
              </TableBodyCell>
            ))}
          </TableBodyRow>
        ))}
      </TableBody>
    </Table>
  );
}
