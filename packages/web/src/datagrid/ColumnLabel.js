//@ts-nocheck

import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';
import useTheme from '../theme/useTheme';

const Label = styled.span`
  font-weight: ${props => (props.notNull ? 'bold' : 'normal')};
  white-space: nowrap;
`;
const ExtInfoWrap = styled.span`
  font-weight: normal;
  margin-left: 5px;
  color: ${props => props.theme.left_font3};
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
  const theme = useTheme();
  return (
    <Label {...column}>
      {icon ? <FontIcon icon={icon} /> : null} {column.headerText || column.columnName}
      {column.extInfo ? <ExtInfoWrap theme={theme}>{column.extInfo}</ExtInfoWrap> : null}
    </Label>
  );
}
