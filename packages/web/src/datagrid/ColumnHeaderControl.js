import React from 'react';
import styled from 'styled-components';
import ColumnLabel from './ColumnLabel';
import DropDownButton from '../widgets/DropDownButton';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { FontIcon } from '../icons';

const HeaderDiv = styled.div`
  display: flex;
`;

const LabelDiv = styled.div`
  flex: 1;
  min-width: 10px;
  // padding-left: 2px;
  padding: 2px;
  margin: auto;
`;

const IconWrapper = styled.span`
  margin-left: 3px;
`;

export default function ColumnHeaderControl({ column, setSort, order }) {
  return (
    <HeaderDiv>
      <LabelDiv>
        <ColumnLabel {...column} />
        {order == 'ASC' && (
          <IconWrapper>
            <FontIcon icon="fas fa-sort-alpha-down green" />
          </IconWrapper>
        )}
        {order == 'DESC' && (
          <IconWrapper>
            <FontIcon icon="fas fa-sort-alpha-down-alt green" />
          </IconWrapper>
        )}
      </LabelDiv>
      {setSort && (
        <DropDownButton>
          <DropDownMenuItem onClick={() => setSort('ASC')}>Sort ascending</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setSort('DESC')}>Sort descending</DropDownMenuItem>
        </DropDownButton>
      )}
    </HeaderDiv>
  );
}
