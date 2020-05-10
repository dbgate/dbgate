import React from 'react';
import styled from 'styled-components';
import ColumnLabel from './ColumnLabel';
import DropDownButton from '../widgets/DropDownButton';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { useSplitterDrag } from '../widgets/Splitter';
import { FontIcon } from '../icons';

const HeaderDiv = styled.div`
  display: flex;
  flex-wrap: nowrap;
`;

const LabelDiv = styled.div`
  flex: 1;
  min-width: 10px;
  // padding-left: 2px;
  padding: 2px;
  margin: auto;
  white-space: nowrap;
`;

const IconWrapper = styled.span`
  margin-left: 3px;
`;

const ResizeHandle = styled.div`
  background-color: #ccc;
  width: 2px;
  cursor: col-resize;
  z-index: 1;
`;

export default function ColumnHeaderControl({ column, setSort, onResize, order }) {
  const onResizeDown = useSplitterDrag('clientX', onResize);
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
      <ResizeHandle className="resizeHandleControl" onMouseDown={onResizeDown} />
    </HeaderDiv>
  );
}
