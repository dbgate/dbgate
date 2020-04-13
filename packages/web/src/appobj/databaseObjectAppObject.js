import _ from 'lodash';
import React from 'react';
import { getIconImage } from '../icons';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { openNewTab } from '../utility/common';
import { getConnectionInfo } from '../utility/metadataLoaders';
import fullDisplayName from '../utility/fullDisplayName';
import { filterName } from '@dbgate/datalib';

const icons = {
  tables: 'table2.svg',
  views: 'view2.svg',
  procedures: 'procedure2.svg',
  functions: 'function.svg',
};

const menus = {
  tables: [
    {
      label: 'Open data',
      tab: 'TableDataTab',
    },
    {
      label: 'Open structure',
      tab: 'TableStructureTab',
    },
    {
      label: 'Show CREATE TABLE script',
      tab: 'TableCreateScriptTab',
    },
  ],
  views: [
    {
      label: 'Open data',
      tab: 'ViewDataTab',
    },
    {
      label: 'Show CREATE VIEW script',
      tab: 'SqlObjectCreateScriptTab',
    },
  ],
  procedures: [
    {
      label: 'Show CREATE PROCEDURE script',
      tab: 'SqlObjectCreateScriptTab',
    },
    {
      label: 'Show EXECUTE script',
      tab: 'ExecuteProcedureTab',
    },
  ],
  functions: [
    {
      label: 'Show CREATE FUNCTION script',
      tab: 'SqlObjectCreateScriptTab',
    },
  ],
};

const defaultTabs = {
  tables: 'TableDataTab',
  views: 'ViewDataTab',
  procedures: 'SqlObjectCreateScriptTab',
  functions: 'SqlObjectCreateScriptTab',
};

async function openObjectDetail(
  setOpenedTabs,
  tabComponent,
  { schemaName, pureName, conid, database, objectTypeField }
) {
  const connection = await getConnectionInfo({ conid });
  const tooltip = `${connection.displayName || connection.server}\n${database}\n${fullDisplayName({
    schemaName,
    pureName,
  })}`;

  openNewTab(setOpenedTabs, {
    title: pureName,
    tooltip,
    icon: icons[objectTypeField],
    tabComponent,
    props: {
      schemaName,
      pureName,
      conid,
      database,
      objectTypeField,
    },
  });
}

function Menu({ data, makeAppObj, setOpenedTabs }) {
  return (
    <>
      {menus[data.objectTypeField].map((menu) => (
        <DropDownMenuItem
          key={menu.label}
          onClick={() => {
            openObjectDetail(setOpenedTabs, menu.tab, data);
          }}
        >
          {menu.label}
        </DropDownMenuItem>
      ))}
    </>
  );
}

const databaseObjectAppObject = () => (
  { conid, database, pureName, schemaName, objectTypeField },
  { setOpenedTabs }
) => {
  const title = schemaName ? `${schemaName}.${pureName}` : pureName;
  const key = title;
  const Icon = (props) => getIconImage(icons[objectTypeField], props);
  const onClick = ({ schemaName, pureName }) => {
    openObjectDetail(setOpenedTabs, defaultTabs[objectTypeField], {
      schemaName,
      pureName,
      conid,
      database,
      objectTypeField,
    });
  };
  const matcher = (filter) => filterName(filter, pureName);
  const groupTitle = _.startCase(objectTypeField);

  return { title, key, Icon, Menu, onClick, matcher, groupTitle };
};

export default databaseObjectAppObject;
