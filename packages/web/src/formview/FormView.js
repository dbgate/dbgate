import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import ColumnLabel from '../datagrid/ColumnLabel';
import { findForeignKeyForColumn } from 'dbgate-tools';
import styled from 'styled-components';
import useTheme from '../theme/useTheme';
import useDimensions from '../utility/useDimensions';
import FormViewToolbar from './FormViewToolbar';
import { useShowMenu } from '../modals/showMenu';
import FormViewContextMenu from './FormViewContextMenu';
import keycodes from '../utility/keycodes';
import { CellFormattedValue } from '../datagrid/DataGridRow';
import { cellFromEvent } from '../datagrid/selection';

const Table = styled.table`
  border-collapse: collapse;
  outline: none;
`;

const Wrapper = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  display: flex;
  overflow-x: scroll;
`;

const TableRow = styled.tr`
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

  ${(props) =>
    // @ts-ignore
    props.isSelected &&
    `
    background: initial;
    background-color: ${props.theme.gridbody_selection[4]};
    color: ${props.theme.gridbody_invfont1};`}
`;

const TableBodyCell = styled.td`
  font-weight: normal;
  border: 1px solid ${(props) => props.theme.border};
  // border-collapse: collapse;
  padding: 2px;
  white-space: nowrap;
  position: relative;
  overflow: hidden;

  ${(props) =>
    // @ts-ignore
    props.isSelected &&
    `
    background: initial;
    background-color: ${props.theme.gridbody_selection[4]};
    color: ${props.theme.gridbody_invfont1};`}
`;

const HintSpan = styled.span`
  color: gray;
  margin-left: 5px;
`;
const NullSpan = styled.span`
  color: gray;
  font-style: italic;
`;

const FocusField = styled.input`
  // visibility: hidden
  position: absolute;
  left: -1000px;
  top: -1000px;
`;

export default function FormView(props) {
  const { rowData, toolbarPortalRef, tabVisible, config, setConfig, onNavigate } = props;
  /** @type {import('dbgate-datalib').FormViewDisplay} */
  const formDisplay = props.formDisplay;
  const theme = useTheme();
  const [headerRowRef, { height: rowHeight }] = useDimensions();
  const [wrapperRef, { height: wrapperHeight }] = useDimensions();
  const showMenu = useShowMenu();
  const focusFieldRef = React.useRef(null);
  const [currentCell, setCurrentCell] = React.useState([0, 0]);
  const cellRefs = React.useRef({});

  const rowCount = Math.floor((wrapperHeight - 20) / rowHeight);
  const columnChunks = _.chunk(formDisplay.columns, rowCount);

  const handleSwitchToTable = () => {
    setConfig((cfg) => ({
      ...cfg,
      isFormView: false,
      formViewKey: null,
    }));
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    showMenu(
      event.pageX,
      event.pageY,
      <FormViewContextMenu switchToTable={handleSwitchToTable} onNavigate={onNavigate} />
    );
  };

  const setCellRef = (row, col, element) => {
    cellRefs.current[`${row},${col}`] = element;
  };

  React.useEffect(() => {
    if (tabVisible) {
      if (focusFieldRef.current) focusFieldRef.current.focus();
    }
  }, [tabVisible, focusFieldRef.current]);

  const moveCursor = (row, col) => {
    if (row < 0) row = 0;
    if (col < 0) col = 0;
    if (col >= columnChunks.length * 2) col = columnChunks.length * 2 - 1;
    const chunk = columnChunks[Math.floor(col / 2)];
    if (chunk && row >= chunk.length) row = chunk.length - 1;
    return [row, col];
  };

  const handleCursorMove = (event) => {
    if (event.ctrlKey) {
      switch (event.keyCode) {
        case keycodes.leftArrow:
          return moveCursor(currentCell[0], 0);
        case keycodes.rightArrow:
          return moveCursor(currentCell[0], columnChunks.length * 2 - 1);
      }
    }
    switch (event.keyCode) {
      case keycodes.leftArrow:
        return moveCursor(currentCell[0], currentCell[1] - 1);
      case keycodes.rightArrow:
        return moveCursor(currentCell[0], currentCell[1] + 1);
      case keycodes.upArrow:
        return moveCursor(currentCell[0] - 1, currentCell[1]);
      case keycodes.downArrow:
        return moveCursor(currentCell[0] + 1, currentCell[1]);
      case keycodes.pageUp:
        return moveCursor(0, currentCell[1]);
      case keycodes.pageDown:
        return moveCursor(rowCount - 1, currentCell[1]);
      case keycodes.home:
        return moveCursor(0, 0);
      case keycodes.end:
        return moveCursor(rowCount - 1, columnChunks.length * 2 - 1);
    }
  };

  const handleKeyNavigation = (event) => {
    if (event.ctrlKey) {
      switch (event.keyCode) {
        case keycodes.upArrow:
          return 'previous';
        case keycodes.downArrow:
          return 'next';
        case keycodes.home:
          return 'begin';
        case keycodes.end:
          return 'end';
      }
    }
  };

  const scrollIntoView = (cell) => {
    const element = cellRefs.current[`${cell[0]},${cell[1]}`];
    if (element) element.scrollIntoView();
  };

  React.useEffect(() => {
    scrollIntoView(currentCell);
  }, [rowData]);

  const handleKeyDown = (event) => {
    const navigation = handleKeyNavigation(event);
    if (navigation) {
      event.preventDefault();
      onNavigate(navigation);
      return;
    }
    const moved = handleCursorMove(event);
    if (moved) {
      setCurrentCell(moved);
      scrollIntoView(moved);
      event.preventDefault();
      return;
    }
  };

  const handleTableMouseDown = (event) => {
    event.preventDefault();
    if (focusFieldRef.current) focusFieldRef.current.focus();

    if (event.target.closest('.buttonLike')) return;
    if (event.target.closest('.resizeHandleControl')) return;
    if (event.target.closest('input')) return;

    // event.target.closest('table').focus();
    event.preventDefault();
    if (focusFieldRef.current) focusFieldRef.current.focus();
    const cell = cellFromEvent(event);
    // @ts-ignore
    setCurrentCell(cell);
  };

  const toolbar =
    toolbarPortalRef &&
    toolbarPortalRef.current &&
    tabVisible &&
    ReactDOM.createPortal(
      <FormViewToolbar switchToTable={handleSwitchToTable} onNavigate={onNavigate} />,
      toolbarPortalRef.current
    );

  if (!formDisplay || !formDisplay.isLoadedCorrectly) return toolbar;

  return (
    <Wrapper ref={wrapperRef} onContextMenu={handleContextMenu}>
      {columnChunks.map((chunk, chunkIndex) => (
        <Table key={chunkIndex} onMouseDown={handleTableMouseDown}>
          {chunk.map((col, rowIndex) => (
            <TableRow key={col.columnName} theme={theme} ref={headerRowRef} style={{ height: `${rowHeight}px` }}>
              <TableHeaderCell
                theme={theme}
                data-row={rowIndex}
                data-col={chunkIndex * 2}
                // @ts-ignore
                isSelected={currentCell[0] == rowIndex && currentCell[1] == chunkIndex * 2}
                ref={(element) => setCellRef(rowIndex, chunkIndex * 2, element)}
              >
                <ColumnLabel {...col} />
              </TableHeaderCell>
              <TableBodyCell
                theme={theme}
                data-row={rowIndex}
                data-col={chunkIndex * 2 + 1}
                // @ts-ignore
                isSelected={currentCell[0] == rowIndex && currentCell[1] == chunkIndex * 2 + 1}
                ref={(element) => setCellRef(rowIndex, chunkIndex * 2 + 1, element)}
              >
                <CellFormattedValue value={rowData && rowData[col.columnName]} dataType={col.dataType} />
              </TableBodyCell>
            </TableRow>
          ))}
        </Table>
      ))}

      <FocusField type="text" ref={focusFieldRef} onKeyDown={handleKeyDown} />

      {toolbar}
    </Wrapper>
  );
}
