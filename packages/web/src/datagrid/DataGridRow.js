import moment from 'moment';
import _ from 'lodash';
import React from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';
import { HorizontalScrollBar, VerticalScrollBar } from './ScrollBars';
import useDimensions from '../utility/useDimensions';
import { SeriesSizes } from './SeriesSizes';
import axios from '../utility/axios';
import ColumnLabel from './ColumnLabel';
import DataFilterControl from './DataFilterControl';
import { getFilterType } from '@dbgate/filterparser';
import {
  convertCellAddress,
  cellFromEvent,
  getCellRange,
  topLeftCell,
  isRegularCell,
  nullCell,
  emptyCellArray,
} from './selection';
import keycodes from '../utility/keycodes';
import InplaceEditor from './InplaceEditor';

const TableBodyCell = styled.td`
  font-weight: normal;
  border: 1px solid #c0c0c0;
  // border-collapse: collapse;
  padding: 2px;
  white-space: nowrap;
  overflow: hidden;
  ${props =>
    // @ts-ignore
    props.isSelected &&
    `
    background: initial;
    background-color: deepskyblue;
    color: white;`}
`;
const HintSpan = styled.span`
  color: gray;
  margin-left: 5px;
`;
const NullSpan = styled.span`
  color: gray;
  font-style: italic;
`;

const TableBodyRow = styled.tr`
  // height: 35px;
  background-color: #ffffff;
  &:nth-child(6n + 3) {
    background-color: #ebebeb;
  }
  &:nth-child(6n + 6) {
    background-color: #ebf5ff;
  }
`;

const TableHeaderCell = styled.td`
  border: 1px solid #c0c0c0;
  text-align: left;
  padding: 2px;
  background-color: #f6f7f9;
  overflow: hidden;
`;

function CellFormattedValue({ value }) {
  if (value == null) return <NullSpan>(NULL)</NullSpan>;
  if (_.isDate(value)) return moment(value).format('YYYY-MM-DD HH:mm:ss');
  return value;
}

export default function DataGridRow({
  rowHeight,
  rowIndex,
  visibleRealColumns,
  inplaceEditorCell,
  cellIsSelected,
  row,
  display,
  changeSet,
  setChangeSet,
}) {
  return (
    <TableBodyRow style={{ height: `${rowHeight}px` }}>
      <TableHeaderCell data-row={rowIndex} data-col="header">
        {rowIndex + 1}
      </TableHeaderCell>
      {visibleRealColumns.map(col => (
        <TableBodyCell
          key={col.uniqueName}
          style={{
            width: col.widthPx,
            minWidth: col.widthPx,
            maxWidth: col.widthPx,
          }}
          data-row={rowIndex}
          data-col={col.colIndex}
          // @ts-ignore
          isSelected={cellIsSelected(rowIndex, col.colIndex)}
        >
          {inplaceEditorCell && rowIndex == inplaceEditorCell[0] && col.colIndex == inplaceEditorCell[1] ? (
            <InplaceEditor
              widthPx={col.widthPx}
              value={row[col.uniqueName]}
              changeSet={changeSet}
              setChangeSet={setChangeSet}
              definition={display.getChangeSetField(row, col.uniqueName)}
            />
          ) : (
            <>
              <CellFormattedValue value={row[col.uniqueName]} />
              {col.hintColumnName && <HintSpan>{row[col.hintColumnName]}</HintSpan>}
            </>
          )}
        </TableBodyCell>
      ))}
    </TableBodyRow>
  );
}
