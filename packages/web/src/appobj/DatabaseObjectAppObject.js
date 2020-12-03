import _ from 'lodash';
import React from 'react';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import { openNewTab } from '../utility/common';
import { getConnectionInfo } from '../utility/metadataLoaders';
import fullDisplayName from '../utility/fullDisplayName';
import { filterName } from 'dbgate-datalib';
import ImportExportModal from '../modals/ImportExportModal';
import { useSetOpenedTabs } from '../utility/globalState';
import { AppObjectCore } from './AppObjectCore';
import useShowModal from '../modals/showModal';

const icons = {
  tables: 'img table',
  views: 'img view',
  procedures: 'img procedure',
  functions: 'img function',
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
      sqlTemplate: 'CREATE TABLE',
    },
    {
      label: 'Export',
      isExport: true,
    },
    {
      label: 'Open in free table editor',
      isOpenFreeTable: true,
    },
  ],
  views: [
    {
      label: 'Open data',
      tab: 'ViewDataTab',
    },
    {
      label: 'Show CREATE VIEW script',
      sqlTemplate: 'CREATE OBJECT',
    },
    {
      label: 'Show CREATE TABLE script',
      sqlTemplate: 'CREATE TABLE',
    },
    {
      label: 'Export',
      isExport: true,
    },
    {
      label: 'Open in free table editor',
      isOpenFreeTable: true,
    },
    {
      label: 'Open structure',
      tab: 'TableStructureTab',
    },
  ],
  procedures: [
    {
      label: 'Show CREATE PROCEDURE script',
      sqlTemplate: 'CREATE OBJECT',
    },
    {
      label: 'Show EXECUTE script',
      sqlTemplate: 'EXECUTE PROCEDURE',
    },
  ],
  functions: [
    {
      label: 'Show CREATE FUNCTION script',
      sqlTemplate: 'CREATE OBJECT',
    },
  ],
};

const defaultTabs = {
  tables: 'TableDataTab',
  views: 'ViewDataTab',
};

export async function openDatabaseObjectDetail(
  setOpenedTabs,
  tabComponent,
  sqlTemplate,
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
    icon: sqlTemplate ? 'img sql-file' : icons[objectTypeField],
    tabComponent: sqlTemplate ? 'QueryTab' : tabComponent,
    props: {
      schemaName,
      pureName,
      conid,
      database,
      objectTypeField,
      initialArgs: sqlTemplate ? { sqlTemplate } : null,
    },
  });
}

function Menu({ data }) {
  const showModal = useShowModal();
  const setOpenedTabs = useSetOpenedTabs();
  return (
    <>
      {menus[data.objectTypeField].map((menu) => (
        <DropDownMenuItem
          key={menu.label}
          onClick={async () => {
            if (menu.isExport) {
              showModal((modalState) => (
                <ImportExportModal
                  modalState={modalState}
                  initialValues={{
                    sourceStorageType: 'database',
                    sourceConnectionId: data.conid,
                    sourceDatabaseName: data.database,
                    sourceSchemaName: data.schemaName,
                    sourceList: [data.pureName],
                  }}
                />
              ));
            } else if (menu.isOpenFreeTable) {
              const coninfo = await getConnectionInfo(data);
              openNewTab(setOpenedTabs, {
                title: data.pureName,
                icon: 'img free-table',
                tabComponent: 'FreeTableTab',
                props: {
                  initialData: {
                    functionName: 'tableReader',
                    props: {
                      connection: {
                        ...coninfo,
                        database: data.database,
                      },
                      schemaName: data.schemaName,
                      pureName: data.pureName,
                    },
                  },
                },
              });
            } else {
              openDatabaseObjectDetail(setOpenedTabs, menu.tab, menu.sqlTemplate, data);
            }
          }}
        >
          {menu.label}
        </DropDownMenuItem>
      ))}
    </>
  );
}

function DatabaseObjectAppObject({ data, commonProps }) {
  const { conid, database, pureName, schemaName, objectTypeField } = data;
  const setOpenedTabs = useSetOpenedTabs();
  // const Icon = (props) => getIconImage(icons[objectTypeField], props);
  const onClick = ({ schemaName, pureName }) => {
    openDatabaseObjectDetail(
      setOpenedTabs,
      defaultTabs[objectTypeField],
      defaultTabs[objectTypeField] ? null : 'CREATE OBJECT',
      {
        schemaName,
        pureName,
        conid,
        database,
        objectTypeField,
      }
    );
  };
  // const matcher = (filter) => filterName(filter, pureName);
  // const groupTitle = _.startCase(objectTypeField);

  return (
    <AppObjectCore
      {...commonProps}
      data={data}
      title={schemaName ? `${schemaName}.${pureName}` : pureName}
      icon={icons[objectTypeField]}
      onClick={onClick}
      Menu={Menu}
    />
  );
  // return { title, key, icon, Menu, onClick, matcher, groupTitle };
}

DatabaseObjectAppObject.extractKey = ({ schemaName, pureName }) =>
  schemaName ? `${schemaName}.${pureName}` : pureName;

DatabaseObjectAppObject.createMatcher = ({ pureName }) => (filter) => filterName(filter, pureName);

// DatabaseObjectAppObject.groupTitle = ({ pureName }) => (filter) => filterName(filter, pureName);

export default DatabaseObjectAppObject;
