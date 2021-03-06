import React from 'react';
import styled from 'styled-components';
import ColumnLabel from './ColumnLabel';
import { filterName } from 'dbgate-datalib';
import { ExpandIcon } from '../icons';
import InlineButton from '../widgets/InlineButton';
import { ManagerInnerContainer } from './ManagerStyles';
import SearchInput from '../widgets/SearchInput';
import useTheme from '../theme/useTheme';

const Wrapper = styled.div``;

const Row = styled.div`
  margin-left: 5px;
  margin-right: 5px;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background-color: ${props => props.theme.manager_background_blue[1]};
  }
`;

const SearchBoxWrapper = styled.div`
  display: flex;
  margin-bottom: 5px;
`;

const Button = styled.button`
  // -webkit-appearance: none;
  // -moz-appearance: none;
  // appearance: none;
  // width: 50px;
`;

/**
 * @param {object} props
 * @param {import('dbgate-datalib').GridDisplay} props.display
 * @param {import('dbgate-datalib').DisplayColumn} props.column
 */
function ColumnManagerRow(props) {
  const { display, column } = props;
  const [isHover, setIsHover] = React.useState(false);
  const theme = useTheme();
  return (
    <Row
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      theme={theme}
      onClick={e => {
        // @ts-ignore
        if (e.target.closest('.expandColumnIcon')) return;
        display.focusColumn(column.uniqueName);
      }}
    >
      <ExpandIcon
        className="expandColumnIcon"
        isBlank={!column.foreignKey}
        isExpanded={column.foreignKey && display.isExpandedColumn(column.uniqueName)}
        onClick={() => display.toggleExpandedColumn(column.uniqueName)}
      />
      <input
        type="checkbox"
        style={{ marginLeft: `${5 + (column.uniquePath.length - 1) * 10}px` }}
        checked={column.isChecked}
        onChange={() => display.setColumnVisibility(column.uniquePath, !column.isChecked)}
      ></input>
      <ColumnLabel {...column} />
    </Row>
  );
}

/** @param props {import('./types').DataGridProps} */
export default function ColumnManager(props) {
  const { display } = props;
  const [columnFilter, setColumnFilter] = React.useState('');

  return (
    <>
      <SearchBoxWrapper>
        <SearchInput placeholder="Search columns" filter={columnFilter} setFilter={setColumnFilter} />
        <InlineButton onClick={() => display.hideAllColumns()}>Hide</InlineButton>
        <InlineButton onClick={() => display.showAllColumns()}>Show</InlineButton>
      </SearchBoxWrapper>
      <ManagerInnerContainer style={{ maxWidth: props.managerSize }}>
        {display
          .getColumns(columnFilter)
          .filter(column => filterName(columnFilter, column.columnName))
          .map(column => (
            <ColumnManagerRow key={column.uniqueName} display={display} column={column} />
          ))}
      </ManagerInnerContainer>
    </>
  );
}
