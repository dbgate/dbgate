//@ts-nocheck

import React from 'react';
import styled from 'styled-components';

const Label = styled.span`
  font-weight: ${props => (props.notNull ? 'bold' : 'normal')};
  white-space: nowrap;
`;

/** @param column {import('@dbgate/datalib').DisplayColumn|import('@dbgate/types').ColumnInfo} */
export default function ColumnLabel(column) {
  let icon = null;
  if (column.autoIncrement) icon = 'mdi mdi-numeric-1-box-multiple-outline';
  if (column.foreignKey) icon = 'mdi mdi-key-link';
  return (
    <Label {...column}>
      {icon ? <span className={icon} /> : null} {column.headerText || column.columnName}
    </Label>
  );
}
