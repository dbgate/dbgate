<script lang="ts" context="module">
  export const extractKey = ({ schemaName, pureName }) => (schemaName ? `${schemaName}.${pureName}` : pureName);
  export const createMatcher = ({ pureName }) => filter => filterName(filter, pureName);

  const icons = {
    tables: 'img table',
    collections: 'img collection',
    views: 'img view',
    procedures: 'img procedure',
    functions: 'img function',
  };

  const defaultTabs = {
    tables: 'TableDataTab',
    collections: 'CollectionDataTab',
    views: 'ViewDataTab',
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
        divider: true,
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
        divider: true,
      },
      {
        label: 'SQL: CREATE TABLE',
        sqlTemplate: 'CREATE TABLE',
      },
      {
        label: 'SQL: SELECT',
        sqlTemplate: 'SELECT',
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
      },
      {
        label: 'Query designer',
        isQueryDesigner: true,
      },
      {
        divider: true,
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
        divider: true,
      },
      {
        label: 'SQL: CREATE VIEW',
        sqlTemplate: 'CREATE OBJECT',
      },
      {
        label: 'SQL: CREATE TABLE',
        sqlTemplate: 'CREATE TABLE',
      },
      {
        label: 'SQL: SELECT',
        sqlTemplate: 'SELECT',
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
    procedures: [
      {
        label: 'SQL: CREATE PROCEDURE',
        sqlTemplate: 'CREATE OBJECT',
      },
      {
        label: 'SQL: EXECUTE',
        sqlTemplate: 'EXECUTE PROCEDURE',
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
        label: 'SQL: CREATE FUNCTION',
        sqlTemplate: 'CREATE OBJECT',
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
        label: 'Export',
        isExport: true,
      },
    ],
  };

  export async function openDatabaseObjectDetail(
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
</script>

<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import { currentDatabase, extensions, openedConnections } from '../stores';
  import openNewTab from '../utility/openNewTab';
  import { filterName } from 'dbgate-datalib';
  import { getConnectionInfo } from '../utility/metadataLoaders';
  import fullDisplayName from '../utility/fullDisplayName';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { findEngineDriver } from 'dbgate-tools';
  import uuidv1 from 'uuid/v1';
  import SqlGeneratorModal from '../modals/SqlGeneratorModal.svelte';

  export let data;

  function handleClick() {
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
      false,
      null
    );

    // openNewTab({
    //   title: data.pureName,
    //   icon: 'img table',
    //   tabComponent: 'TableDataTab',
    //   props: {
    //     schemaName,
    //     pureName,
    //     conid,
    //     database,
    //     objectTypeField,
    //   },
    // });
  }

  const getDriver = async () => {
    const conn = await getConnectionInfo(data);
    if (!conn) return;
    const driver = findEngineDriver(conn, $extensions);
    return driver;
  };

  function createMenu() {
    const { objectTypeField } = data;
    return menus[objectTypeField].map(menu => {
      if (menu.divider) return menu;
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
          } else {
            openDatabaseObjectDetail(menu.tab, menu.sqlTemplate, data, menu.forceNewTab, menu.initialData);
          }
        },
      };
    });
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.schemaName ? `${data.schemaName}.${data.pureName}` : data.pureName}
  icon={icons[data.objectTypeField]}
  menu={createMenu}
  on:click={handleClick}
  on:expand
/>
