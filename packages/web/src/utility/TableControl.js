import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';
import keycodes from './keycodes';

const Table = styled.table`
  border-collapse: collapse;
  width: 100%;
  user-select: ${(props) =>
    // @ts-ignore
    props.focusable ? 'none' : ''};
  // outline: none;
`;
const TableHead = styled.thead``;
const TableBody = styled.tbody``;
const TableHeaderRow = styled.tr``;
const TableBodyRow = styled.tr`
  background-color: ${(props) =>
    // @ts-ignore
    props.isSelected ? '#ccccff' : ''};
`;
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

export default function TableControl({
  rows = [],
  children,
  focusOnCreate = false,
  onKeyDown = undefined,
  tabIndex = -1,
  setSelectedIndex = undefined,
  selectedIndex = undefined,
  tableRef = undefined,
}) {
  const columns = (children instanceof Array ? _.flatten(children) : [children])
    .filter((child) => child && child.props && child.props.fieldName)
    .map((child) => child.props);

  const myTableRef = React.useRef(null);
  const currentTableRef = tableRef || myTableRef;

  React.useEffect(() => {
    if (focusOnCreate) {
      currentTableRef.current.focus();
    }
  }, []);

  const handleKeyDown = React.useCallback((event) => {
    if (event.keyCode == keycodes.downArrow) {
      setSelectedIndex((i) => Math.min(i + 1, rows.length - 1));
    }
    if (event.keyCode == keycodes.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (onKeyDown) onKeyDown(event);
  }, [setSelectedIndex, rows]);

  return (
    <Table
      ref={currentTableRef}
      onKeyDown={selectedIndex != null ? handleKeyDown : undefined}
      tabIndex={selectedIndex != null ? tabIndex : undefined}
      // @ts-ignore
      focusable={selectedIndex != null}
    >
      <TableHead>
        <TableHeaderRow>
          {columns.map((x) => (
            <TableHeaderCell key={x.fieldName}>{x.header}</TableHeaderCell>
          ))}
        </TableHeaderRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <TableBodyRow
            key={index}
            // @ts-ignore
            isSelected={index == selectedIndex}
            onClick={
              selectedIndex != null
                ? () => {
                    setSelectedIndex(index);
                    currentTableRef.current.focus();
                  }
                : undefined
            }
          >
            {columns.map((col) => (
              <TableBodyCell key={col.fieldName}>{format(row, col)}</TableBodyCell>
            ))}
          </TableBodyRow>
        ))}
      </TableBody>
    </Table>
  );
}
