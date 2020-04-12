import React from 'react';
import { TableIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { openNewTab } from '../utility/common';
import { getConnectionInfo } from '../utility/metadataLoaders';
import fullDisplayName from '../utility/fullDisplayName';
import { filterName } from '@dbgate/datalib';

async function openTableDetail(setOpenedTabs, tabComponent, { schemaName, pureName, conid, database }) {
  const connection = await getConnectionInfo({ conid });
  const tooltip = `${connection.displayName || connection.server}\n${database}\n${fullDisplayName({
    schemaName,
    pureName,
  })}`;

  openNewTab(setOpenedTabs, {
    title: pureName,
    tooltip,
    icon: 'table2.svg',
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
    openTableDetail(setOpenedTabs, 'TableDataTab', data);
  };
  const handleOpenStructure = () => {
    openTableDetail(setOpenedTabs, 'TableStructureTab', data);
  };
  const handleOpenCreateScript = () => {
    openTableDetail(setOpenedTabs, 'TableCreateScriptTab', data);
  };
  return (
    <>
      <DropDownMenuItem onClick={handleOpenData}>Open data</DropDownMenuItem>
      <DropDownMenuItem onClick={handleOpenStructure}>Open structure</DropDownMenuItem>
      <DropDownMenuItem onClick={handleOpenCreateScript}>Show CREATE TABLE script</DropDownMenuItem>
    </>
  );
}

const tableAppObject = () => ({ conid, database, pureName, schemaName }, { setOpenedTabs }) => {
  const title = schemaName ? `${schemaName}.${pureName}` : pureName;
  const key = title;
  const Icon = TableIcon;
  const onClick = ({ schemaName, pureName }) => {
    openTableDetail(setOpenedTabs, 'TableDataTab', {
      schemaName,
      pureName,
      conid,
      database,
    });
  };
  const matcher = (filter) => filterName(filter, pureName);
  const groupTitle = 'Tables';

  return { title, key, Icon, Menu, onClick, matcher, groupTitle };
};

export default tableAppObject;
