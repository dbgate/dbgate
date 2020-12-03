//@ts-nocheck

import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';

const Label = styled.span`
  font-weight: ${(props) => (props.notNull ? 'bold' : 'normal')};
  white-space: nowrap;
`;

/** @param column {import('dbgate-datalib').DisplayColumn|import('dbgate-types').ColumnInfo} */
export default function ColumnLabel(column) {
  let icon = column.forceIcon ? 'img column' : null;
  if (column.autoIncrement) icon = 'img autoincrement';
  if (column.foreignKey) icon = 'img foreign-key';
  return (
    <Label {...column}>
      {icon ? <FontIcon icon={icon} /> : null} {column.headerText || column.columnName}
    </Label>
  );
}
