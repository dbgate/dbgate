import React from 'react';
import styled from 'styled-components';
import ColumnLabel from './ColumnLabel';
import { filterName } from '@dbgate/datalib';
import { FontIcon } from '../icons';

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
  width: 50px;
`;

const Input = styled.input`
  flex: 1;
  width: 80px;
`;

function ExpandIcon({ display, column, isHover, ...other }) {
  if (column.foreignKey) {
    return (
      <FontIcon
        icon={`far ${display.isExpandedColumn(column.uniqueName) ? 'fa-minus-square' : 'fa-plus-square'} `}
        {...other}
      />
    );
  }
  return <FontIcon icon={`fas fa-square ${isHover ? 'lightblue' : 'white'}`} {...other} />;
}

/**
 * @param {object} props
 * @param {import('@dbgate/datalib').GridDisplay} props.display
 * @param {import('@dbgate/datalib').DisplayColumn} props.column
 */
function ColumnManagerRow(props) {
  const { display, column } = props;
  const [isHover, setIsHover] = React.useState(false);
  return (
    <Row onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
      <ExpandIcon
        display={display}
        column={column}
        isHover={isHover}
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
    <Wrapper>
      <SearchBoxWrapper>
        <Input type="text" placeholder="Search" value={columnFilter} onChange={e => setColumnFilter(e.target.value)} />
        <Button onClick={() => display.hideAllColumns()}>Hide</Button>
        <Button onClick={() => display.showAllColumns()}>Show</Button>
      </SearchBoxWrapper>
      {display
        .getColumns(columnFilter)
        .filter(column => filterName(columnFilter, column.columnName))
        .map(column => (
          <ColumnManagerRow key={column.uniqueName} display={display} column={column} />
        ))}
    </Wrapper>
  );
}
