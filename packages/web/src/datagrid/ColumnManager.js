import React from 'react';
import styled from 'styled-components';
import ColumnLabel from './ColumnLabel';

const Row = styled.div`
  margin-left: 5px;
  margin-right: 5px;
  cursor: pointer;
  &:hover {
    background-color: lightblue;
  }
`;

/** @param props {import('./types').DataGridProps} */
export default function ColumnManager(props) {
  const { display } = props;
  return (
    <div>
      {display.columns.map(item => (
        <Row key={item.columnName}>
          <input
            type="checkbox"
            checked={item.isChecked}
            onChange={() => display.setColumnVisibility(item.uniqueName, !item.isChecked)}
          ></input>
          <ColumnLabel {...item} />
        </Row>
      ))}
    </div>
  );
}
