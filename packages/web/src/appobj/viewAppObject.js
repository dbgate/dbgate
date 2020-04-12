import React from 'react';
import { ViewIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { openNewTab } from '../utility/common';
import getConnectionInfo from '../utility/getConnectionInfo';
import fullDisplayName from '../utility/fullDisplayName';
import { filterName } from '@dbgate/datalib';

async function openViewDetail(setOpenedTabs, tabComponent, { schemaName, pureName, conid, database }) {
  const connection = await getConnectionInfo(conid);
  const tooltip = `${connection.displayName || connection.server}\n${database}\n${fullDisplayName({
    schemaName,
    pureName,
  })}`;

  openNewTab(setOpenedTabs, {
    title: pureName,
    tooltip,
    icon: 'view2.svg',
    tabComponent,
    props: {
      schemaName,
      pureName,
      conid,
      database,
    },
  });
}

function Menu({ data, makeAppObj, setOpenedTabs }) {
  const handleOpenData = () => {
    openViewDetail(setOpenedTabs, 'TableDataTab', data);
  };
  const handleOpenCreateScript = () => {
    openViewDetail(setOpenedTabs, 'TableCreateScriptTab', data);
  };
  return (
    <>
      <DropDownMenuItem onClick={handleOpenData}>Open data</DropDownMenuItem>
      <DropDownMenuItem onClick={handleOpenCreateScript}>Create SQL</DropDownMenuItem>
    </>
  );
}

const viewAppObject = () => ({ conid, database, pureName, schemaName }, { setOpenedTabs }) => {
  const title = schemaName ? `${schemaName}.${pureName}` : pureName;
  const key = title;
  const Icon = ViewIcon;
  const onClick = ({ schemaName, pureName }) => {
    openViewDetail(setOpenedTabs, 'ViewDataTab', {
      schemaName,
      pureName,
      conid,
      database,
    });
  };
  const matcher = (filter) => filterName(filter, pureName);
  const groupTitle = 'Views';

  return {
    title,
    key,
    Icon,
    Menu,
    onClick,
    matcher,
    groupTitle,
  };
};

export default viewAppObject;
