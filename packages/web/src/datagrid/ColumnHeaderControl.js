import React from 'react';
import styled from 'styled-components';
import ColumnLabel from './ColumnLabel';
import DropDownButton from '../widgets/DropDownButton';
import { DropDownMenuItem } from '../modals/DropDownMenu';

const HeaderDiv = styled.div`
  display: flex;
`;

const LabelDiv = styled.div`
  flex: 1;
  min-width: 10px;
  padding-left: 2px;
  margin: auto;
`;

export default function ColumnHeaderControl({ column }) {
  return (
    <HeaderDiv>
      <LabelDiv>
        <ColumnLabel {...column} />
      </LabelDiv>
      <DropDownButton>
        <DropDownMenuItem onClick={() => {}}>Sort ascending</DropDownMenuItem>
        <DropDownMenuItem onClick={() => {}}>Sort descending</DropDownMenuItem>
      </DropDownButton>
    </HeaderDiv>
  );
}
