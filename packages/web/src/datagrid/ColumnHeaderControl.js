import React from 'react';
import styled from 'styled-components';
import ColumnLabel from './ColumnLabel';
import DropDownButton from '../widgets/DropDownButton';
import { DropDownMenuItem, DropDownMenuDivider } from '../modals/DropDownMenu';
import { useSplitterDrag } from '../widgets/Splitter';
import { isTypeDateTime } from '@dbgate/tools';
import { openDatabaseObjectDetail } from '../appobj/databaseObjectAppObject';
import { useSetOpenedTabs } from '../utility/globalState';
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

const GroupingLabel = styled.span`
  color: green;
  white-space: nowrap;
`;

export default function ColumnHeaderControl({
  column,
  setSort,
  onResize,
  order,
  setGrouping,
  grouping,
  conid,
  database,
}) {
  const onResizeDown = useSplitterDrag('clientX', onResize);
  const { foreignKey } = column;
  const setOpenedTabs = useSetOpenedTabs();

  const openReferencedTable = () => {
    openDatabaseObjectDetail(setOpenedTabs, 'TableDataTab', null, {
      schemaName: foreignKey.refSchemaName,
      pureName: foreignKey.refTableName,
      conid,
      database,
      objectTypeField: 'tables',
    });
    // openNewTab(setOpenedTabs, {
    //   title: foreignKey.refTableName,
    //   tooltip,
    //   icon: sqlTemplate ? 'sql.svg' : icons[objectTypeField],
    //   tabComponent: sqlTemplate ? 'QueryTab' : tabComponent,
    //   props: {
    //     schemaName,
    //     pureName,
    //     conid,
    //     database,
    //     objectTypeField,
    //     initialArgs: sqlTemplate ? { sqlTemplate } : null,
    //   },
    // });
  };
  return (
    <HeaderDiv>
      <LabelDiv>
        {grouping && (
          <GroupingLabel>{grouping == 'COUNT DISTINCT' ? 'distinct' : grouping.toLowerCase()}:</GroupingLabel>
        )}

        <ColumnLabel {...column} />
        {order == 'ASC' && (
          <IconWrapper>
            <FontIcon icon="mdi mdi-sort-alphabetical-ascending color-green" />
          </IconWrapper>
        )}
        {order == 'DESC' && (
          <IconWrapper>
            <FontIcon icon="mdi mdi-sort-alphabetical-descending color-green" />
          </IconWrapper>
        )}
      </LabelDiv>
      {setSort && (
        <DropDownButton>
          <DropDownMenuItem onClick={() => setSort('ASC')}>Sort ascending</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setSort('DESC')}>Sort descending</DropDownMenuItem>
          <DropDownMenuDivider />
          {foreignKey && (
            <DropDownMenuItem onClick={openReferencedTable}>
              Open table <strong>{foreignKey.refTableName}</strong>
            </DropDownMenuItem>
          )}
          {foreignKey && <DropDownMenuDivider />}
          <DropDownMenuItem onClick={() => setGrouping('GROUP')}>Group by</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setGrouping('MAX')}>MAX</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setGrouping('MIN')}>MIN</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setGrouping('SUM')}>SUM</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setGrouping('AVG')}>AVG</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setGrouping('COUNT')}>COUNT</DropDownMenuItem>
          <DropDownMenuItem onClick={() => setGrouping('COUNT DISTINCT')}>COUNT DISTINCT</DropDownMenuItem>
          {isTypeDateTime(column.dataType) && (
            <>
              <DropDownMenuDivider />
              <DropDownMenuItem onClick={() => setGrouping('GROUP:YEAR')}>Group by YEAR</DropDownMenuItem>
              <DropDownMenuItem onClick={() => setGrouping('GROUP:MONTH')}>Group by MONTH</DropDownMenuItem>
              <DropDownMenuItem onClick={() => setGrouping('GROUP:DAY')}>Group by DAY</DropDownMenuItem>
              {/* <DropDownMenuItem onClick={() => setGrouping('GROUP:HOUR')}>Group by HOUR</DropDownMenuItem>
              <DropDownMenuItem onClick={() => setGrouping('GROUP:MINUTE')}>Group by MINUTE</DropDownMenuItem> */}
            </>
          )}
        </DropDownButton>
      )}
      <ResizeHandle className="resizeHandleControl" onMouseDown={onResizeDown} />
    </HeaderDiv>
  );
}
