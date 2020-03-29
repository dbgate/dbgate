// @ts-nocheck
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
import { findExistingChangeSetItem } from '@dbgate/datalib';
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
    props.isSelected &&
    `
    background: initial;
    background-color: deepskyblue;
    color: white;`}
  ${props =>
    props.isModifiedRow &&
    !props.isInsertedRow &&
    !props.isSelected &&
    !props.isModifiedCell &&
    `
  background-color: #FFFFDB;`}
  ${props =>
    !props.isSelected &&
    !props.isInsertedRow &&
    props.isModifiedCell &&
    `
      background-color: bisque;`}

  ${props =>
    !props.isSelected &&
    props.isInsertedRow &&
    `
      background-color: #DBFFDB;`}

    ${props =>
      !props.isSelected &&
      props.isDeletedRow &&
      `
      background-color: #FFDBFF;
      background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAEElEQVQImWNgIAX8x4KJBAD+agT8INXz9wAAAABJRU5ErkJggg==');
      // from http://www.patternify.com/
      background-repeat: repeat-x;
      background-position: 50% 50%;`}
          
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
  inplaceEditorState,
  dispatchInsplaceEditor,
  cellIsSelected,
  row,
  display,
  changeSet,
  setChangeSet,
  insertedRowIndex,
}) {
  // console.log('RENDER ROW', rowIndex);
  const rowDefinition = display.getChangeSetRow(row);
  const [matchedField, matchedChangeSetItem] = findExistingChangeSetItem(changeSet, rowDefinition);
  const rowUpdated = matchedChangeSetItem ? { ...row, ...matchedChangeSetItem.fields } : row;
  const hintFieldsAllowed = visibleRealColumns
    .filter(col => {
      if (!col.hintColumnName) return false;
      if (matchedChangeSetItem && matchedField == 'updates' && col.uniqueName in matchedChangeSetItem.fields)
        return false;
      return true;
    })
    .map(col => col.uniqueName);
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
          isModifiedRow={!!matchedChangeSetItem}
          isModifiedCell={
            matchedChangeSetItem && matchedField == 'updates' && col.uniqueName in matchedChangeSetItem.fields
          }
          isInsertedRow={insertedRowIndex != null}
          isDeletedRow={matchedField == 'deletes'}
        >
          {inplaceEditorState.cell &&
          rowIndex == inplaceEditorState.cell[0] &&
          col.colIndex == inplaceEditorState.cell[1] ? (
            <InplaceEditor
              widthPx={col.widthPx}
              inplaceEditorState={inplaceEditorState}
              dispatchInsplaceEditor={dispatchInsplaceEditor}
              cellValue={rowUpdated[col.uniqueName]}
              changeSet={changeSet}
              setChangeSet={setChangeSet}
              insertedRowIndex={insertedRowIndex}
              definition={display.getChangeSetField(row, col.uniqueName, insertedRowIndex)}
            />
          ) : (
            <>
              <CellFormattedValue value={rowUpdated[col.uniqueName]} />
              {hintFieldsAllowed.includes(col.uniqueName) && <HintSpan>{row[col.hintColumnName]}</HintSpan>}
            </>
          )}
        </TableBodyCell>
      ))}
    </TableBodyRow>
  );
}
