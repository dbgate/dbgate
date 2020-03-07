import React from 'react';
import styled from 'styled-components';
import ColumnLabel from './ColumnLabel';
import { filterName } from '@dbgate/datalib';

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
      {display.columns
        .filter(col => filterName(columnFilter, col.columnName))
        .map(col => (
          <Row key={col.columnName}>
            <input
              type="checkbox"
              checked={col.isChecked}
              onChange={() => display.setColumnVisibility(col.uniqueName, !col.isChecked)}
            ></input>
            <ColumnLabel {...col} />
          </Row>
        ))}
    </Wrapper>
  );
}
