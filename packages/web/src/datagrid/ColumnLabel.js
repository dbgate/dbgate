//@ts-nocheck

import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';

const Label = styled.span`
  font-weight: ${props => (props.notNull ? 'bold' : 'normal')};
  white-space: nowrap;
`;

export function getColumnIcon(column, forceIcon = false) {
  if (column.autoIncrement) return 'img autoincrement';
  if (column.foreignKey) return 'img foreign-key';
  if (forceIcon) return 'img column';
  return null;
}

/** @param column {import('dbgate-datalib').DisplayColumn|import('dbgate-types').ColumnInfo} */
export default function ColumnLabel(column) {
  const icon = getColumnIcon(column, column.forceIcon);
  return (
    <Label {...column}>
      {icon ? <FontIcon icon={icon} /> : null} {column.headerText || column.columnName}
    </Label>
  );
}
