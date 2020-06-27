// @ts-nocheck
import moment from 'moment';
import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { findExistingChangeSetItem } from '@dbgate/datalib';
import InplaceEditor from './InplaceEditor';
import { cellIsSelected } from './gridutil';
import { isTypeLogical } from '@dbgate/tools';

const TableBodyCell = styled.td`
  font-weight: normal;
  border: 1px solid #c0c0c0;
  // border-collapse: collapse;
  padding: 2px;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  ${(props) =>
    props.isSelected &&
    !props.isAutofillSelected &&
    !props.isFocusedColumn &&
    `
    background: initial;
    background-color: deepskyblue;
    color: white;`}

  ${(props) =>
    props.isAutofillSelected &&
    !props.isFocusedColumn &&
    `
    background: initial;
    background-color: magenta;
    color: white;`}

    ${(props) =>
      props.isModifiedRow &&
      !props.isInsertedRow &&
      !props.isSelected &&
      !props.isAutofillSelected &&
      !props.isModifiedCell &&
      !props.isFocusedColumn &&
      `
  background-color: #FFFFDB;`}
  ${(props) =>
    !props.isSelected &&
    !props.isAutofillSelected &&
    !props.isInsertedRow &&
    !props.isFocusedColumn &&
    props.isModifiedCell &&
    `
      background-color: bisque;`}

  ${(props) =>
    !props.isSelected &&
    !props.isAutofillSelected &&
    !props.isFocusedColumn &&
    props.isInsertedRow &&
    `
      background-color: #DBFFDB;`}

    ${(props) =>
      !props.isSelected &&
      !props.isAutofillSelected &&
      !props.isFocusedColumn &&
      props.isDeletedRow &&
      `
      background-color: #FFDBFF;
  `}

  ${(props) =>
    props.isFocusedColumn &&
    `
    background-color: lightgoldenrodyellow;
  `}
  
    ${(props) =>
      props.isDeletedRow &&
      `
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

const AutoFillPoint = styled.div`
  width: 8px;
  height: 8px;
  background-color: #1a73e8;
  position: absolute;
  right: 0px;
  bottom: 0px;
  overflow: visible;
  cursor: crosshair;
`;

function makeBulletString(value) {
  return _.pad('', value.length, '•');
}

function highlightSpecialCharacters(value) {
  value = value.replace(/\n/g, '↲');
  value = value.replace(/\r/g, '');
  value = value.replace(/^(\s+)/, makeBulletString);
  value = value.replace(/(\s+)$/, makeBulletString);
  value = value.replace(/(\s\s+)/g, makeBulletString);
  return value;
}

const dateTimeRegex = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d\d\d)?Z?$/;

function CellFormattedValue({ value, dataType }) {
  if (value == null) return <NullSpan>(NULL)</NullSpan>;
  if (_.isDate(value)) return moment(value).format('YYYY-MM-DD HH:mm:ss');
  if (value === true) return '1';
  if (value === false) return '0';
  if (_.isNumber(value)) {
    if (value >= 10000 || value <= -10000) {
      return value.toLocaleString();
    }
    return value.toString();
  }
  if (_.isString(value)) {
    if (dateTimeRegex.test(value)) return moment(value).format('YYYY-MM-DD HH:mm:ss');
    return highlightSpecialCharacters(value);
  }
  if (_.isPlainObject(value)) {
    if (_.isArray(value.data)) {
      if (value.data.length == 1 && isTypeLogical(dataType)) return value.data[0];
      return <NullSpan>({value.data.length} bytes)</NullSpan>;
    }
    return <NullSpan>(RAW)</NullSpan>;
  }
  return value.toString();
}

function DataGridRow({
  rowHeight,
  rowIndex,
  visibleRealColumns,
  inplaceEditorState,
  dispatchInsplaceEditor,
  row,
  display,
  changeSet,
  setChangeSet,
  insertedRowIndex,
  autofillMarkerCell,
  selectedCells,
  autofillSelectedCells,
  focusedColumn,
}) {
  // usePropsCompare({
  //   rowHeight,
  //   rowIndex,
  //   visibleRealColumns,
  //   inplaceEditorState,
  //   dispatchInsplaceEditor,
  //   row,
  //   display,
  //   changeSet,
  //   setChangeSet,
  //   insertedRowIndex,
  //   autofillMarkerCell,
  //   selectedCells,
  //   autofillSelectedCells,
  // });

  // console.log('RENDER ROW', rowIndex);

  const rowDefinition = display.getChangeSetRow(row, insertedRowIndex);
  const [matchedField, matchedChangeSetItem] = findExistingChangeSetItem(changeSet, rowDefinition);
  const rowUpdated = matchedChangeSetItem ? { ...row, ...matchedChangeSetItem.fields } : row;
  const hintFieldsAllowed = visibleRealColumns
    .filter((col) => {
      if (!col.hintColumnName) return false;
      if (matchedChangeSetItem && matchedField == 'updates' && col.uniqueName in matchedChangeSetItem.fields)
        return false;
      return true;
    })
    .map((col) => col.uniqueName);

  return (
    <TableBodyRow style={{ height: `${rowHeight}px` }}>
      <TableHeaderCell data-row={rowIndex} data-col="header">
        {rowIndex + 1}
      </TableHeaderCell>
      {visibleRealColumns.map((col) => (
        <TableBodyCell
          key={col.uniqueName}
          style={{
            width: col.widthPx,
            minWidth: col.widthPx,
            maxWidth: col.widthPx,
          }}
          data-row={rowIndex}
          data-col={col.colIndex}
          isSelected={cellIsSelected(rowIndex, col.colIndex, selectedCells)}
          isAutofillSelected={cellIsSelected(rowIndex, col.colIndex, autofillSelectedCells)}
          isModifiedRow={!!matchedChangeSetItem}
          isFocusedColumn={col.uniqueName == focusedColumn}
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
              <CellFormattedValue value={rowUpdated[col.uniqueName]} dataType={col.dataType} />
              {hintFieldsAllowed.includes(col.uniqueName) && <HintSpan>{row[col.hintColumnName]}</HintSpan>}
            </>
          )}
          {autofillMarkerCell && autofillMarkerCell[1] == col.colIndex && autofillMarkerCell[0] == rowIndex && (
            <AutoFillPoint className="autofillHandleMarker"></AutoFillPoint>
          )}
        </TableBodyCell>
      ))}
    </TableBodyRow>
  );
}

export default React.memo(DataGridRow);
