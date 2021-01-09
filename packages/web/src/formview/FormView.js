import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import ColumnLabel from '../datagrid/ColumnLabel';
import { findForeignKeyForColumn } from 'dbgate-tools';
import styled from 'styled-components';
import useTheme from '../theme/useTheme';
import useDimensions from '../utility/useDimensions';
import FormViewToolbar from './FormViewToolbar';

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
`;

const TableBodyCell = styled.td`
  font-weight: normal;
  border: 1px solid ${(props) => props.theme.border};
  // border-collapse: collapse;
  padding: 2px;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
`;

const HintSpan = styled.span`
  color: gray;
  margin-left: 5px;
`;
const NullSpan = styled.span`
  color: gray;
  font-style: italic;
`;

export default function FormView(props) {
  const { rowData, toolbarPortalRef, tabVisible, config, setConfig } = props;
  /** @type {import('dbgate-datalib').FormViewDisplay} */
  const formDisplay = props.formDisplay;
  const theme = useTheme();
  const [headerRowRef, { height: rowHeight }] = useDimensions();
  const [wrapperRef, { height: wrapperHeight }] = useDimensions();

  const handleSwitchToTable = () => {
    setConfig((cfg) => ({
      ...cfg,
      isFormView: false,
      formViewKey: null,
    }));
  };

  const toolbar =
    toolbarPortalRef &&
    toolbarPortalRef.current &&
    tabVisible &&
    ReactDOM.createPortal(<FormViewToolbar switchToTable={handleSwitchToTable} />, toolbarPortalRef.current);

  // console.log('display', display);

  if (!formDisplay || !formDisplay.isLoadedCorrectly) return toolbar;

  const rowCount = Math.floor((wrapperHeight - 20) / rowHeight);
  const columnChunks = _.chunk(formDisplay.columns, rowCount);

  return (
    <Wrapper ref={wrapperRef}>
      {columnChunks.map((chunk, index) => (
        <Table key={index}>
          {chunk.map((col) => (
            <TableRow key={col.columnName} theme={theme} ref={headerRowRef} style={{ height: `${rowHeight}px` }}>
              <TableHeaderCell theme={theme}>
                <ColumnLabel {...col} />
              </TableHeaderCell>
              <TableBodyCell theme={theme}>{rowData && rowData[col.columnName]}</TableBodyCell>
            </TableRow>
          ))}
        </Table>
      ))}

      {toolbar}
    </Wrapper>
  );
}
