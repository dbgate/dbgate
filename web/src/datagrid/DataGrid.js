import React, { useState } from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';
import { HorizontalScrollBar, VerticalScrollBar } from './ScrollBars';
import useDimensions from '../utility/useDimensions';

const GridContainer = styled.div``;

const Table = styled.table`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 20px;
  right: 20px;
  overflow: scroll;
  border-collapse: collapse;
`;
const TableHead = styled.thead`
  // display: block;
  // width: 300px;
`;
const TableBody = styled.tbody`
  // display: block;
  // overflow: auto;
  // height: 100px;
`;
const TableHeaderRow = styled.tr`
  // height: 35px;
`;
const TableBodyRow = styled.tr`
  // height: 35px;
  background-color: #ffffff;
  &:nth-child(6n + 4) {
    background-color: #ebebeb;
  }
  &:nth-child(6n + 7) {
    background-color: #ebf5ff;
  }
`;
const TableHeaderCell = styled.td`
  font-weight: bold;
  border: 1px solid #c0c0c0;
  // border-collapse: collapse;
  text-align: left;
  padding: 2px;
  background-color: #f6f7f9;
  overflow: hidden;
`;
const TableBodyCell = styled.td`
  font-weight: normal;
  border: 1px solid #c0c0c0;
  // border-collapse: collapse;
  padding: 2px;
  white-space: nowrap;
  overflow: hidden;
`;

export default function DataGrid({ params }) {
  const data = useFetch({
    url: 'tables/table-data',
    params,
  });
  const { rows, columns } = data || {};
  const [firstVisibleRowScrollIndex, setFirstVisibleRowScrollIndex] = useState(0);

  const [headerRowRef, { height: rowHeight }] = useDimensions();
  const [tableBodyRef, { height: gridScrollAreaHeight }] = useDimensions();

  //   const visibleRowCountUpperBound = Math.ceil(gridScrollAreaHeight / Math.floor(rowHeight));
  //   const visibleRowCountLowerBound = Math.floor(gridScrollAreaHeight / Math.ceil(rowHeight));
  const visibleRowCountUpperBound = 20;
  const visibleRowCountLowerBound = 20;

  if (!columns || !rows) return null;
  const rowCountNewIncluded = rows.length;

  const handleRowScroll = value => {
    setFirstVisibleRowScrollIndex(value);
  };

  console.log('visibleRowCountUpperBound', visibleRowCountUpperBound);
  console.log('gridScrollAreaHeight', gridScrollAreaHeight);

  return (
    <GridContainer>
      <Table>
        <TableHead>
          <TableHeaderRow ref={headerRowRef}>
            {columns.map(col => (
              <TableHeaderCell key={col.name} style={{ width: '60px' }}>
                {col.name}
              </TableHeaderCell>
            ))}
          </TableHeaderRow>
        </TableHead>
        <TableBody ref={tableBodyRef}>
          {rows
            .slice(firstVisibleRowScrollIndex, firstVisibleRowScrollIndex + visibleRowCountUpperBound)
            .map((row, index) => (
              <TableBodyRow key={firstVisibleRowScrollIndex + index}>
                {columns.map(col => (
                  <TableBodyCell key={col.name} style={{ width: '60px' }}>
                    {row[col.name]}
                  </TableBodyCell>
                ))}
              </TableBodyRow>
            ))}
        </TableBody>
      </Table>
      <HorizontalScrollBar minimum={0} maximum={columns.length - 1} />
      <VerticalScrollBar
        minimum={0}
        maximum={rowCountNewIncluded - visibleRowCountUpperBound + 2}
        onScroll={handleRowScroll}
        viewportRatio={visibleRowCountUpperBound / rowCountNewIncluded}
      />
    </GridContainer>
  );
}
