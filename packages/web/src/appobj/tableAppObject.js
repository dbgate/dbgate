import React from 'react';
import { TableIcon } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import showModal from '../modals/showModal';
import ConnectionModal from '../modals/ConnectionModal';
import axios from '../utility/axios';
import { openNewTab } from '../utility/common';
import { useSetOpenedTabs } from '../utility/globalState';
import getConnectionInfo from '../utility/getConnectionInfo';
import fullDisplayName from '../utility/fullDisplayName';

async function openTableDetail(setOpenedTabs, tabComponent, { schemaName, pureName, conid, database }) {
  const connection = await getConnectionInfo(conid);
  const tooltip = `${connection.displayName || connection.server}\n${database}\n${fullDisplayName({schemaName, pureName})}`;

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
      <DropDownMenuItem onClick={handleOpenCreateScript}>Create SQL</DropDownMenuItem>
    </>
  );
}

export default function tableAppObject({ conid, database, pureName, schemaName }, { setOpenedTabs }) {
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

  return { title, key, Icon, Menu, onClick };
}
