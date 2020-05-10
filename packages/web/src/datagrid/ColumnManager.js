import React from 'react';
import styled from 'styled-components';
import ColumnLabel from './ColumnLabel';
import { filterName } from '@dbgate/datalib';
import { ExpandIcon } from '../icons';
import InlineButton from '../widgets/InlineButton';
import { ManagerInnerContainer } from './ManagerStyles';
import SearchInput from '../widgets/SearchInput';
import { WidgetTitle } from '../widgets/WidgetStyles';

const Wrapper = styled.div``;

const Row = styled.div`
  margin-left: 5px;
  margin-right: 5px;
  cursor: pointer;
  &:hover {
    background-color: lightblue;
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

// const Input = styled.input`
//   flex: 1;
//   min-width: 90px;
// `;

// function ExpandIcon({ display, column, isHover, ...other }) {
//   if (column.foreignKey) {
//     return (
//       <FontIcon
//         icon={`far ${display.isExpandedColumn(column.uniqueName) ? 'fa-minus-square' : 'fa-plus-square'} `}
//         {...other}
//       />
//     );
//   }
//   return <FontIcon icon={`fas fa-square ${isHover ? 'lightblue' : 'white'}`} {...other} />;
// }

/**
 * @param {object} props
 * @param {import('@dbgate/datalib').GridDisplay} props.display
 * @param {import('@dbgate/datalib').DisplayColumn} props.column
 */
function ColumnManagerRow(props) {
  const { display, column } = props;
  const [isHover, setIsHover] = React.useState(false);
  return (
    <Row
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onClick={(e) => {
        // @ts-ignore
        if (e.target.closest('.expandColumnIcon')) return;
        display.focusColumn(column.uniqueName);
      }}
    >
      <ExpandIcon
        className="expandColumnIcon"
        isBlank={!column.foreignKey}
        isExpanded={column.foreignKey && display.isExpandedColumn(column.uniqueName)}
        isSelected={isHover}
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
  const inputRef = React.useRef(null);

  return (
    <>
      <WidgetTitle inputRef={inputRef}>Columns</WidgetTitle>
      <SearchBoxWrapper>
        <SearchInput
          placeholder="Search columns"
          filter={columnFilter}
          setFilter={setColumnFilter}
          inputRef={inputRef}
        />
        <InlineButton onClick={() => display.hideAllColumns()}>Hide</InlineButton>
        <InlineButton onClick={() => display.showAllColumns()}>Show</InlineButton>
      </SearchBoxWrapper>
      <ManagerInnerContainer>
        {display
          .getColumns(columnFilter)
          .filter((column) => filterName(columnFilter, column.columnName))
          .map((column) => (
            <ColumnManagerRow key={column.uniqueName} display={display} column={column} />
          ))}
      </ManagerInnerContainer>
    </>
  );
}
