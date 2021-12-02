<script lang="ts" context="module">
  export const extractKey = ({ schemaName, pureName }) => (schemaName ? `${schemaName}.${pureName}` : pureName);
  export const createMatcher = ({ pureName }) => filter => filterName(filter, pureName);
  const electron = getElectron();

  export const databaseObjectIcons = {
    tables: 'img table',
    collections: 'img collection',
    views: 'img view',
    matviews: 'img view',
    procedures: 'img procedure',
    functions: 'img function',
  };

  const defaultTabs = {
    tables: 'TableDataTab',
    collections: 'CollectionDataTab',
    views: 'ViewDataTab',
    matviews: 'ViewDataTab',
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
        icon: 'img table-structure',
      },
      {
        label: 'Drop table',
        isDrop: true,
      },
      {
        label: 'Rename table',
        isRename: true,
      },
      {
        label: 'Query designer',
        isQueryDesigner: true,
      },
      {
        divider: true,
      },
      {
        isQuickExport: true,
        functionName: 'tableReader',
      },
      {
        label: 'Export',
        isExport: true,
      },
      {
        label: 'Open as data sheet',
        isOpenFreeTable: true,
      },
      {
        label: 'Open active chart',
        isActiveChart: true,
      },
      {
        divider: true,
      },
      {
        label: 'SQL: CREATE TABLE',
        scriptTemplate: 'CREATE TABLE',
      },
      {
        label: 'SQL: SELECT',
        scriptTemplate: 'SELECT',
      },
      {
        label: 'SQL Generator: CREATE TABLE',
        sqlGeneratorProps: {
          createTables: true,
          createIndexes: true,
          createForeignKeys: true,
        },
      },
      {
        label: 'SQL Generator: DROP TABLE',
        sqlGeneratorProps: {
          dropTables: true,
          dropReferences: true,
        },
      },
      {
        label: 'SQL Generator: INSERT',
        sqlGeneratorProps: {
          insert: true,
        },
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
        icon: 'img view-structure',
      },
      {
        label: 'Drop view',
        isDrop: true,
      },
      {
        label: 'Query designer',
        isQueryDesigner: true,
      },
      {
        divider: true,
      },
      {
        isQuickExport: true,
        functionName: 'tableReader',
      },
      {
        label: 'Export',
        isExport: true,
      },
      {
        label: 'Open as data sheet',
        isOpenFreeTable: true,
      },
      {
        label: 'Open active chart',
        isActiveChart: true,
      },
      {
        divider: true,
      },
      {
        label: 'SQL: CREATE VIEW',
        scriptTemplate: 'CREATE OBJECT',
      },
      {
        label: 'SQL: CREATE TABLE',
        scriptTemplate: 'CREATE TABLE',
      },
      {
        label: 'SQL: SELECT',
        scriptTemplate: 'SELECT',
      },
      {
        label: 'SQL Generator: CREATE VIEW',
        sqlGeneratorProps: {
          createViews: true,
        },
      },
      {
        label: 'SQL Generator: DROP VIEW',
        sqlGeneratorProps: {
          dropViews: true,
        },
      },
    ],
    matviews: [
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
        label: 'Drop view',
        isDrop: true,
      },
      {
        label: 'Query designer',
        isQueryDesigner: true,
      },
      {
        divider: true,
      },
      {
        isQuickExport: true,
        functionName: 'tableReader',
      },
      {
        label: 'Export',
        isExport: true,
      },
      {
        label: 'Open as data sheet',
        isOpenFreeTable: true,
      },
      {
        label: 'Open active chart',
        isActiveChart: true,
      },
      {
        divider: true,
      },
      {
        label: 'SQL: CREATE MATERIALIZED VIEW',
        scriptTemplate: 'CREATE OBJECT',
      },
      {
        label: 'SQL: CREATE TABLE',
        scriptTemplate: 'CREATE TABLE',
      },
      {
        label: 'SQL: SELECT',
        scriptTemplate: 'SELECT',
      },
      {
        label: 'SQL Generator: CREATE MATERIALIZED VIEW',
        sqlGeneratorProps: {
          createMatviews: true,
        },
      },
      {
        label: 'SQL Generator: DROP MATERIALIZED VIEW',
        sqlGeneratorProps: {
          dropMatviews: true,
        },
      },
    ],
    procedures: [
      {
        label: 'Drop procedure',
        isDrop: true,
      },
      {
        label: 'SQL: CREATE PROCEDURE',
        scriptTemplate: 'CREATE OBJECT',
      },
      {
        label: 'SQL: EXECUTE',
        scriptTemplate: 'EXECUTE PROCEDURE',
      },
      {
        label: 'SQL Generator: CREATE PROCEDURE',
        sqlGeneratorProps: {
          createProcedures: true,
        },
      },
      {
        label: 'SQL Generator: DROP PROCEDURE',
        sqlGeneratorProps: {
          dropProcedures: true,
        },
      },
    ],
    functions: [
      {
        label: 'Drop function',
        isDrop: true,
      },
      {
        label: 'SQL: CREATE FUNCTION',
        scriptTemplate: 'CREATE OBJECT',
      },
      {
        label: 'SQL Generator: CREATE FUNCTION',
        sqlGeneratorProps: {
          createFunctions: true,
        },
      },
      {
        label: 'SQL Generator: DROP FUNCTION',
        sqlGeneratorProps: {
          dropFunctions: true,
        },
      },
    ],
    collections: [
      {
        label: 'Open data',
        tab: 'CollectionDataTab',
        forceNewTab: true,
      },
      {
        label: 'Open JSON',
        tab: 'CollectionDataTab',
        forceNewTab: true,
        initialData: {
          grid: {
            isJsonView: true,
          },
        },
      },
      {
        isQuickExport: true,
        functionName: 'tableReader',
      },
      {
        label: 'Export',
        isExport: true,
      },
      {
        label: 'Drop collection',
        isDropCollection: true,
      },
      {
        divider: true,
      },
      {
        label: 'JS: dropCollection()',
        scriptTemplate: 'dropCollection',
      },
      {
        label: 'JS: find()',
        scriptTemplate: 'findCollection',
      },
    ],
  };

  export async function openDatabaseObjectDetail(
    tabComponent,
    scriptTemplate,
    { schemaName, pureName, conid, database, objectTypeField },
    forceNewTab,
    initialData,
    icon
  ) {
    const connection = await getConnectionInfo({ conid });
    const tooltip = `${getConnectionLabel(connection)}\n${database}\n${fullDisplayName({
      schemaName,
      pureName,
    })}`;

    openNewTab(
      {
        title: scriptTemplate ? 'Query #' : pureName,
        tooltip,
        icon: icon || (scriptTemplate ? 'img sql-file' : databaseObjectIcons[objectTypeField]),
        tabComponent: scriptTemplate ? 'QueryTab' : tabComponent,
        props: {
          schemaName,
          pureName,
          conid,
          database,
          objectTypeField,
          initialArgs: scriptTemplate ? { scriptTemplate } : null,
        },
      },
      initialData,
      { forceNewTab }
    );
  }

  export function handleDatabaseObjectClick(data, forceNewTab = false) {
    const { schemaName, pureName, conid, database, objectTypeField } = data;

    openDatabaseObjectDetail(
      defaultTabs[objectTypeField],
      defaultTabs[objectTypeField] ? null : 'CREATE OBJECT',
      {
        schemaName,
        pureName,
        conid,
        database,
        objectTypeField,
      },
      forceNewTab,
      null,
      null
    );
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import { currentDatabase, extensions, openedConnections } from '../stores';
  import openNewTab from '../utility/openNewTab';
  import { filterName, generateDbPairingId, getAlterDatabaseScript } from 'dbgate-tools';
  import { getConnectionInfo, getDatabaseInfo } from '../utility/metadataLoaders';
  import fullDisplayName from '../utility/fullDisplayName';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { findEngineDriver } from 'dbgate-tools';
  import uuidv1 from 'uuid/v1';
  import SqlGeneratorModal from '../modals/SqlGeneratorModal.svelte';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import getElectron from '../utility/getElectron';
  import { exportElectronFile } from '../utility/exportElectronFile';
  import createQuickExportMenu from '../utility/createQuickExportMenu';
  import ConfirmSqlModal from '../modals/ConfirmSqlModal.svelte';
  import axiosInstance from '../utility/axiosInstance';
  import { alterDatabaseDialog, renameDatabaseObjectDialog } from '../utility/alterDatabaseTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';

  export let data;

  function handleClick(forceNewTab = false) {
    handleDatabaseObjectClick(data, forceNewTab);
  }

  const getDriver = async () => {
    const conn = await getConnectionInfo(data);
    if (!conn) return;
    const driver = findEngineDriver(conn, $extensions);
    return driver;
  };

  function createMenu() {
    const { objectTypeField } = data;
    return menus[objectTypeField]
      .filter(x => x)
      .map(menu => {
        if (menu.divider) return menu;

        if (menu.isQuickExport) {
          return createQuickExportMenu($extensions, fmt => async () => {
            const coninfo = await getConnectionInfo(data);
            exportElectronFile(
              data.pureName,
              {
                functionName: menu.functionName,
                props: {
                  connection: {
                    ..._.omit(coninfo, ['_id', 'displayName']),
                    ..._.pick(data, ['database']),
                  },
                  ..._.pick(data, ['pureName', 'schemaName']),
                },
              },
              fmt
            );
          });
        }

        return {
          text: menu.label,
          onClick: async () => {
            if (menu.isExport) {
              showModal(ImportExportModal, {
                initialValues: {
                  sourceStorageType: 'database',
                  sourceConnectionId: data.conid,
                  sourceDatabaseName: data.database,
                  sourceSchemaName: data.schemaName,
                  sourceList: [data.pureName],
                },
              });
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
            } else if (menu.sqlGeneratorProps) {
              showModal(SqlGeneratorModal, {
                initialObjects: [data],
                initialConfig: menu.sqlGeneratorProps,
                conid: data.conid,
                database: data.database,
              });
            } else if (menu.isDrop) {
              const { conid, database } = data;
              alterDatabaseDialog(conid, database, db => {
                _.remove(
                  db[data.objectTypeField] as any[],
                  x => x.schemaName == data.schemaName && x.pureName == data.pureName
                );
              });
            } else if (menu.isRename) {
              const { conid, database } = data;
              renameDatabaseObjectDialog(conid, database, data.pureName, (db, newName) => {
                const obj = db[data.objectTypeField].find(
                  x => x.schemaName == data.schemaName && x.pureName == data.pureName
                );
                obj.pureName = newName;
              });
            } else if (menu.isDropCollection) {
              showModal(ConfirmModal, {
                message: `Really drop collection ${data.pureName}?`,
                onConfirm: async () => {
                  const dbid = _.pick(data, ['conid', 'database']);
                  await axiosInstance.request({
                    url: 'database-connections/run-script',
                    method: 'post',
                    params: dbid,
                    data: { sql: `db.dropCollection('${data.pureName}')` },
                  });
                  axiosInstance.post('database-connections/sync-model', dbid);
                },
              });
            } else {
              openDatabaseObjectDetail(
                menu.tab,
                menu.scriptTemplate,
                data,
                menu.forceNewTab,
                menu.initialData,
                menu.icon
              );
            }
          },
        };
      });
  }
</script>

<AppObjectCore
  {...$$restProps}
  module={$$props.module}
  {data}
  title={data.schemaName ? `${data.schemaName}.${data.pureName}` : data.pureName}
  icon={databaseObjectIcons[data.objectTypeField]}
  menu={createMenu}
  on:click={() => handleClick()}
  on:middleclick={() => handleClick(true)}
  on:expand
/>
