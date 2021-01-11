// @ts-nocheck
import moment from 'moment';
import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import InplaceEditor from './InplaceEditor';
import { cellIsSelected } from './gridutil';
import { isTypeLogical } from 'dbgate-tools';
import useTheme from '../theme/useTheme';
import { FontIcon } from '../icons';

const TableBodyCell = styled.td`
  font-weight: normal;
  border: 1px solid ${(props) => props.theme.border};
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
    background-color: ${props.theme.gridbody_selection[4]};
    color: ${props.theme.gridbody_invfont1};`}

  ${(props) =>
    props.isFrameSelected &&
    `
      outline: 3px solid ${props.theme.gridbody_selection[4]};
      outline-offset: -3px;`}
  
  ${(props) =>
    props.isAutofillSelected &&
    !props.isFocusedColumn &&
    `
      outline: 3px solid ${props.theme.gridbody_selection[4]};
      outline-offset: -3px;`}

    ${(props) =>
    props.isModifiedRow &&
    !props.isInsertedRow &&
    !props.isSelected &&
    !props.isAutofillSelected &&
    !props.isModifiedCell &&
    !props.isFocusedColumn &&
    `
  background-color: ${props.theme.gridbody_background_gold[1]};`}
  ${(props) =>
    !props.isSelected &&
    !props.isAutofillSelected &&
    !props.isInsertedRow &&
    !props.isFocusedColumn &&
    props.isModifiedCell &&
    `
      background-color: ${props.theme.gridbody_background_orange[1]};`}

  ${(props) =>
    !props.isSelected &&
    !props.isAutofillSelected &&
    !props.isFocusedColumn &&
    props.isInsertedRow &&
    `
      background-color: ${props.theme.gridbody_background_green[1]};`}

  ${(props) =>
    !props.isSelected &&
    !props.isAutofillSelected &&
    !props.isFocusedColumn &&
    props.isDeletedRow &&
    `
      background-color: ${props.theme.gridbody_background_volcano[1]};
  `}

  ${(props) =>
    props.isFocusedColumn &&
    `
    background-color: ${props.theme.gridbody_background_yellow[0]};
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
  background-color: ${(props) => props.theme.gridbody_background};
  &:nth-child(6n + 3) {
    background-color: ${(props) => props.theme.gridbody_background_alt2};
  }
  &:nth-child(6n + 6) {
    background-color: ${(props) => props.theme.gridbody_background_alt3};
  }
`;

const TableHeaderCell = styled.td`
  border: 1px solid ${(props) => props.theme.border};
  text-align: left;
  padding: 2px;
  background-color: ${(props) => props.theme.gridheader_background};
  overflow: hidden;
  position: relative;
`;

const AutoFillPoint = styled.div`
  width: 8px;
  height: 8px;
  background-color: ${(props) => props.theme.gridbody_selection[6]};
  position: absolute;
  right: 0px;
  bottom: 0px;
  overflow: visible;
  cursor: crosshair;
`;

const ShowFormButton = styled.div`
  position: absolute;
  right: 2px;
  top: 2px;
  &:hover {
    background-color: ${(props) => props.theme.gridheader_background_blue[4]};
    border: 1px solid ${(props) => props.theme.border};
  }
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

export function CellFormattedValue({ value, dataType }) {
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

function RowHeaderCell({ rowIndex, theme, onSetFormView, rowData }) {
  const [mouseIn, setMouseIn] = React.useState(false);

  return (
    <TableHeaderCell
      data-row={rowIndex}
      data-col="header"
      theme={theme}
      onMouseEnter={onSetFormView ? () => setMouseIn(true) : null}
      onMouseLeave={onSetFormView ? () => setMouseIn(false) : null}
    >
      {rowIndex + 1}
      {!!onSetFormView && mouseIn && (
        <ShowFormButton
          theme={theme}
          onClick={(e) => {
            e.stopPropagation();
            onSetFormView(rowData);
          }}
        >
          <FontIcon icon="icon form" />
        </ShowFormButton>
      )}
    </TableHeaderCell>
  );
}

/** @param props {import('./types').DataGridProps} */
function DataGridRow(props) {
  const {
    rowHeight,
    rowIndex,
    visibleRealColumns,
    inplaceEditorState,
    dispatchInsplaceEditor,
    autofillMarkerCell,
    selectedCells,
    autofillSelectedCells,
    focusedColumn,
    grider,
    frameSelection,
    onSetFormView,
  } = props;
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

  const theme = useTheme();

  const rowData = grider.getRowData(rowIndex);
  const rowStatus = grider.getRowStatus(rowIndex);

  const hintFieldsAllowed = visibleRealColumns
    .filter((col) => {
      if (!col.hintColumnName) return false;
      if (rowStatus.modifiedFields && rowStatus.modifiedFields.has(col.uniqueName)) return false;
      return true;
    })
    .map((col) => col.uniqueName);

  if (!rowData) return null;

  return (
    <TableBodyRow style={{ height: `${rowHeight}px` }} theme={theme}>
      <RowHeaderCell rowIndex={rowIndex} theme={theme} onSetFormView={onSetFormView} rowData={rowData} />

      {visibleRealColumns.map((col) => (
        <TableBodyCell
          key={col.uniqueName}
          theme={theme}
          style={{
            width: col.widthPx,
            minWidth: col.widthPx,
            maxWidth: col.widthPx,
          }}
          data-row={rowIndex}
          data-col={col.colIndex}
          isSelected={frameSelection ? false : cellIsSelected(rowIndex, col.colIndex, selectedCells)}
          isFrameSelected={frameSelection ? cellIsSelected(rowIndex, col.colIndex, selectedCells) : false}
          isAutofillSelected={cellIsSelected(rowIndex, col.colIndex, autofillSelectedCells)}
          isModifiedRow={rowStatus.status == 'updated'}
          isFocusedColumn={col.uniqueName == focusedColumn}
          isModifiedCell={rowStatus.modifiedFields && rowStatus.modifiedFields.has(col.uniqueName)}
          isInsertedRow={
            rowStatus.status == 'inserted' || (rowStatus.insertedFields && rowStatus.insertedFields.has(col.uniqueName))
          }
          isDeletedRow={
            rowStatus.status == 'deleted' || (rowStatus.deletedFields && rowStatus.deletedFields.has(col.uniqueName))
          }
        >
          {inplaceEditorState.cell &&
          rowIndex == inplaceEditorState.cell[0] &&
          col.colIndex == inplaceEditorState.cell[1] ? (
            <InplaceEditor
              widthPx={col.widthPx}
              inplaceEditorState={inplaceEditorState}
              dispatchInsplaceEditor={dispatchInsplaceEditor}
              cellValue={rowData[col.uniqueName]}
              // grider={grider}
              // rowIndex={rowIndex}
              // uniqueName={col.uniqueName}
              onSetValue={(value) => grider.setCellValue(rowIndex, col.uniqueName, value)}
            />
          ) : (
            <>
              <CellFormattedValue value={rowData[col.uniqueName]} dataType={col.dataType} />
              {hintFieldsAllowed.includes(col.uniqueName) && <HintSpan>{rowData[col.hintColumnName]}</HintSpan>}
            </>
          )}
          {autofillMarkerCell && autofillMarkerCell[1] == col.colIndex && autofillMarkerCell[0] == rowIndex && (
            <AutoFillPoint className="autofillHandleMarker" theme={theme}></AutoFillPoint>
          )}
        </TableBodyCell>
      ))}
    </TableBodyRow>
  );
}

export default React.memo(DataGridRow);
