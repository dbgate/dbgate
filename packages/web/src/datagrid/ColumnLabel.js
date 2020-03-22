//@ts-nocheck

import React from 'react';
import styled from 'styled-components';
import { SequenceIcon, ForeignKeyIcon } from '../icons';

const Label = styled.span`
  font-weight: ${props => (props.notNull ? 'bold' : 'normal')};
`;

/** @param column {import('@dbgate/datalib').DisplayColumn|import('@dbgate/types').ColumnInfo} */
export default function ColumnLabel(column) {
  let Icon = null;
  if (column.autoIncrement) Icon = SequenceIcon;
  if (column.foreignKey) Icon = ForeignKeyIcon;
  return (
    <Label {...column}>
      {Icon ? <Icon size={12} /> : null} {column.headerText || column.columnName}
    </Label>
  );
}
