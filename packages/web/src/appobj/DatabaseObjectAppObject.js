import _ from 'lodash';
import React from 'react';
import { DropDownMenuDivider, DropDownMenuItem } from '../modals/DropDownMenu';
import { getConnectionInfo } from '../utility/metadataLoaders';
import fullDisplayName from '../utility/fullDisplayName';
import { filterName } from 'dbgate-datalib';
import ImportExportModal from '../modals/ImportExportModal';
import { useSetOpenedTabs } from '../utility/globalState';
import { AppObjectCore } from './AppObjectCore';
import useShowModal from '../modals/showModal';
import { findEngineDriver } from 'dbgate-tools';
import useExtensions from '../utility/useExtensions';
import useOpenNewTab from '../utility/useOpenNewTab';
import uuidv1 from 'uuid/v1';
import { AppObjectList } from './AppObjectList';

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
      forceNewTab: true,
    },
    {
      label: 'Open form',
      tab: 'TableDataTab',
      forceNewTab: true,
      initialData: {
        grid: {
          isFormView: true,
        },
      },
    },
    {
      label: 'Open structure',
      tab: 'TableStructureTab',
    },
    {
      label: 'Query designer',
      isQueryDesigner: true,
    },
    {
      isDivider: true,
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
      label: 'Open active chart',
      isActiveChart: true,
    },
    {
      isDivider: true,
    },
    {
      label: 'SQL: CREATE TABLE',
      sqlTemplate: 'CREATE TABLE',
    },
  ],
  views: [
    {
      label: 'Open data',
      tab: 'ViewDataTab',
      forceNewTab: true,
    },
    {
      label: 'Open structure',
      tab: 'TableStructureTab',
    },
    {
      label: 'Query designer',
      isQueryDesigner: true,
    },
    {
      isDivider: true,
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
      label: 'Open active chart',
      isActiveChart: true,
    },
    {
      isDivider: true,
    },
    {
      label: 'SQL: CREATE VIEW',
      sqlTemplate: 'CREATE OBJECT',
    },
    {
      label: 'SQL: CREATE TABLE',
      sqlTemplate: 'CREATE TABLE',
    },
  ],
  procedures: [
    {
      label: 'SQL: CREATE PROCEDURE',
      sqlTemplate: 'CREATE OBJECT',
    },
    {
      label: 'SQL: EXECUTE',
      sqlTemplate: 'EXECUTE PROCEDURE',
    },
  ],
  functions: [
    {
      label: 'SQL: CREATE FUNCTION',
      sqlTemplate: 'CREATE OBJECT',
    },
  ],
};

const defaultTabs = {
  tables: 'TableDataTab',
  views: 'ViewDataTab',
};

export async function openDatabaseObjectDetail(
  openNewTab,
  tabComponent,
  sqlTemplate,
  { schemaName, pureName, conid, database, objectTypeField },
  forceNewTab,
  initialData
) {
  const connection = await getConnectionInfo({ conid });
  const tooltip = `${connection.displayName || connection.server}\n${database}\n${fullDisplayName({
    schemaName,
    pureName,
  })}`;

  openNewTab(
    {
      title: sqlTemplate ? 'Query #' : pureName,
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
    },
    initialData,
    { forceNewTab }
  );
}

function Menu({ data }) {
  const showModal = useShowModal();
  const openNewTab = useOpenNewTab();
  const extensions = useExtensions();

  const getDriver = async () => {
    const conn = await getConnectionInfo(data);
    if (!conn) return;
    const driver = findEngineDriver(conn, extensions);
    return driver;
  };

  return (
    <>
      {menus[data.objectTypeField].map(menu =>
        menu.isDivider ? (
          <DropDownMenuDivider />
        ) : (
          <DropDownMenuItem
            key={menu.label}
            onClick={async () => {
              if (menu.isExport) {
                showModal(modalState => (
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
                openNewTab({
                  title: data.pureName,
                  icon: 'img free-table',
                  tabComponent: 'FreeTableTab',
                  props: {
                    initialArgs: {
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
              } else if (menu.isActiveChart) {
                const driver = await getDriver();
                const dmp = driver.createDumper();
                dmp.put('^select * from %f', data);
                openNewTab(
                  {
                    title: data.pureName,
                    icon: 'img chart',
                    tabComponent: 'ChartTab',
                    props: {
                      conid: data.conid,
                      database: data.database,
                    },
                  },
                  {
                    editor: {
                      config: { chartType: 'bar' },
                      sql: dmp.s,
                    },
                  }
                );
              } else if (menu.isQueryDesigner) {
                openNewTab(
                  {
                    title: 'Query #',
                    icon: 'img query-design',
                    tabComponent: 'QueryDesignTab',
                    props: {
                      conid: data.conid,
                      database: data.database,
                    },
                  },
                  {
                    editor: {
                      tables: [
                        {
                          ...data,
                          designerId: uuidv1(),
                          left: 50,
                          top: 50,
                        },
                      ],
                    },
                  }
                );
              } else {
                openDatabaseObjectDetail(
                  openNewTab,
                  menu.tab,
                  menu.sqlTemplate,
                  data,
                  menu.forceNewTab,
                  menu.initialData
                );
              }
            }}
          >
            {menu.label}
          </DropDownMenuItem>
        )
      )}
    </>
  );
}

function DatabaseObjectAppObject({ data, commonProps }) {
  const { conid, database, pureName, schemaName, objectTypeField } = data;
  const openNewTab = useOpenNewTab();
  const onClick = ({ schemaName, pureName }) => {
    openDatabaseObjectDetail(
      openNewTab,
      defaultTabs[objectTypeField],
      defaultTabs[objectTypeField] ? null : 'CREATE OBJECT',
      {
        schemaName,
        pureName,
        conid,
        database,
        objectTypeField,
      },
      false
    );
  };

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
}

DatabaseObjectAppObject.extractKey = ({ schemaName, pureName }) =>
  schemaName ? `${schemaName}.${pureName}` : pureName;

DatabaseObjectAppObject.createMatcher = ({ pureName }) => filter => filterName(filter, pureName);

export default DatabaseObjectAppObject;
