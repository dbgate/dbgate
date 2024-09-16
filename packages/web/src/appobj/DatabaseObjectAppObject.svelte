<script lang="ts" context="module">
  import { copyTextToClipboard } from '../utility/clipboard';

  export const extractKey = ({ schemaName, pureName }) => (schemaName ? `${schemaName}.${pureName}` : pureName);
  export const createMatcher =
    ({ schemaName, pureName, columns }) =>
    filter =>
      filterName(
        filter,
        pureName,
        schemaName,
        ...(columns?.map(({ columnName }) => ({ childName: columnName })) || [])
      );
  export const createTitle = ({ schemaName, pureName }) => (schemaName ? `${schemaName}.${pureName}` : pureName);

  export const databaseObjectIcons = {
    tables: 'img table',
    collections: 'img collection',
    views: 'img view',
    matviews: 'img view',
    procedures: 'img procedure',
    functions: 'img function',
    queries: 'img query-data',
  };

  const defaultTabs = {
    tables: 'TableDataTab',
    collections: 'CollectionDataTab',
    views: 'ViewDataTab',
    matviews: 'ViewDataTab',
    queries: 'QueryDataTab',
  };

  function createMenusCore(
    objectTypeField,
    driver
  ): {
    label?: string;
    tab?: string;
    forceNewTab?: boolean;
    initialData?: any;
    icon?: string;
    isQueryDesigner?: boolean;
    requiresWriteAccess?: boolean;
    divider?: boolean;
    isDrop?: boolean;
    isRename?: boolean;
    isTruncate?: boolean;
    isCopyTableName?: boolean;
    isDuplicateTable?: boolean;
    isDiagram?: boolean;
    functionName?: string;
    isExport?: boolean;
    isImport?: boolean;
    isActiveChart?: boolean;
    scriptTemplate?: string;
    sqlGeneratorProps?: any;
    isDropCollection?: boolean;
    isRenameCollection?: boolean;
    isDuplicateCollection?: boolean;
  }[] {
    switch (objectTypeField) {
      case 'tables':
        return [
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
            label: 'Design query',
            isQueryDesigner: true,
            requiresWriteAccess: true,
          },
          {
            label: 'Design perspective query',
            tab: 'PerspectiveTab',
            forceNewTab: true,
            icon: 'img perspective',
          },
          {
            divider: true,
          },
          hasPermission('dbops/model/edit') && {
            label: 'Drop table',
            isDrop: true,
            requiresWriteAccess: true,
          },
          hasPermission('dbops/table/rename') && {
            label: 'Rename table',
            isRename: true,
            requiresWriteAccess: true,
          },
          hasPermission('dbops/table/truncate') && {
            label: 'Truncate table',
            isTruncate: true,
            requiresWriteAccess: true,
          },
          {
            label: 'Copy table name',
            isCopyTableName: true,
            requiresWriteAccess: false,
          },
          hasPermission('dbops/table/backup') && {
            label: 'Create table backup',
            isDuplicateTable: true,
            requiresWriteAccess: true,
          },
          hasPermission('dbops/model/view') && {
            label: 'Show diagram',
            isDiagram: true,
          },
          {
            divider: true,
          },
          hasPermission('dbops/export') && {
            label: 'Export',
            functionName: 'tableReader',
            isExport: true,
          },
          hasPermission('dbops/import') && {
            label: 'Import',
            isImport: true,
            requiresWriteAccess: true,
          },
          hasPermission('dbops/charts') && {
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
        ];
      case 'views':
        return [
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
            label: 'Design query',
            isQueryDesigner: true,
          },
          {
            label: 'Design perspective query',
            tab: 'PerspectiveTab',
            forceNewTab: true,
            icon: 'img perspective',
          },
          {
            label: 'Drop view',
            isDrop: true,
          },
          {
            divider: true,
          },
          {
            label: 'Export',
            isExport: true,
            functionName: 'tableReader',
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
            label: 'SQL: ALTER VIEW',
            scriptTemplate: 'ALTER OBJECT',
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
        ];
      case 'matviews':
        return [
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
            label: 'Export',
            isExport: true,
            functionName: 'tableReader',
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
            label: 'SQL: ALTER MATERIALIZED VIEW',
            scriptTemplate: 'ALTER OBJECT',
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
        ];
      case 'queries':
        return [
          {
            label: 'Open data',
            tab: 'QueryDataTab',
            forceNewTab: true,
          },
        ];
      case 'procedures':
        return [
          {
            label: 'Drop procedure',
            isDrop: true,
          },
          {
            label: 'SQL: CREATE PROCEDURE',
            scriptTemplate: 'CREATE OBJECT',
          },
          {
            label: 'SQL: ALTER PROCEDURE',
            scriptTemplate: 'ALTER OBJECT',
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
        ];
      case 'functions':
        return [
          {
            label: 'Drop function',
            isDrop: true,
          },
          {
            label: 'SQL: CREATE FUNCTION',
            scriptTemplate: 'CREATE OBJECT',
          },
          {
            label: 'SQL: ALTER FUNCTION',
            scriptTemplate: 'ALTER OBJECT',
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
        ];
      case 'collections':
        return [
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
            label: 'Design perspective query',
            tab: 'PerspectiveTab',
            forceNewTab: true,
            icon: 'img perspective',
          },
          hasPermission('dbops/export') && {
            label: 'Export',
            isExport: true,
            functionName: 'tableReader',
          },
          hasPermission('dbops/model/edit') && {
            label: `Drop ${driver?.collectionSingularLabel ?? 'collection/container'}`,
            isDropCollection: true,
            requiresWriteAccess: true,
          },
          hasPermission('dbops/table/rename') && {
            label: `Rename ${driver?.collectionSingularLabel ?? 'collection/container'}`,
            isRenameCollection: true,
            requiresWriteAccess: true,
          },
          hasPermission('dbops/table/backup') && {
            label: `Create ${driver?.collectionSingularLabel ?? 'collection/container'} backup`,
            isDuplicateCollection: true,
            requiresWriteAccess: true,
          },
          {
            divider: true,
          },
          ...(driver?.getScriptTemplates?.('collections') || []),
        ];
    }
  }

  async function databaseObjectMenuClickHandler(data, menu) {
    const getDriver = async () => {
      const conn = await getConnectionInfo(data);
      if (!conn) return;
      const driver = findEngineDriver(conn, getExtensions());
      return driver;
    };

    if (menu.isActiveChart) {
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
    } else if (menu.isDiagram) {
      openNewTab(
        {
          title: 'Diagram #',
          icon: 'img diagram',
          tabComponent: 'DiagramTab',
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
                designerId: `${data.pureName}-${uuidv1()}`,
                autoAddReferences: true,
              },
            ],
            references: [],
            autoLayout: true,
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
    } else if (menu.isTruncate) {
      const { conid, database } = data;
      const driver = await getDriver();
      const dmp = driver.createDumper();
      dmp.truncateTable(data);

      const sql = dmp.s;

      showModal(ConfirmSqlModal, {
        sql,
        onConfirm: async () => {
          saveScriptToDatabase({ conid, database }, sql);
        },
        engine: driver.engine,
      });
    } else if (menu.isRename) {
      const { conid, database } = data;
      renameDatabaseObjectDialog(conid, database, data.pureName, (db, newName) => {
        const obj = db[data.objectTypeField].find(x => x.schemaName == data.schemaName && x.pureName == data.pureName);
        obj.pureName = newName;
      });
    } else if (menu.isDropCollection) {
      showModal(ConfirmModal, {
        message: `Really drop collection ${data.pureName}?`,
        onConfirm: async () => {
          const dbid = _.pick(data, ['conid', 'database']);
          runOperationOnDatabase(dbid, {
            type: 'dropCollection',
            collection: data.pureName,
          });
        },
      });
    } else if (menu.isCopyTableName) {
      copyTextToClipboard(data.pureName);
    } else if (menu.isRenameCollection) {
      const driver = await getDriver();
      showModal(InputTextModal, {
        label: `New ${driver?.collectionSingularLabel ?? 'collection/container'} name`,
        header: `Rename ${driver?.collectionSingularLabel ?? 'collection/container'}`,
        value: data.pureName,
        onConfirm: async newName => {
          const dbid = _.pick(data, ['conid', 'database']);
          runOperationOnDatabase(dbid, {
            type: 'renameCollection',
            collection: data.pureName,
            newName,
          });
        },
      });
    } else if (menu.isDuplicateCollection) {
      const newName = `_${data.pureName}_${dateFormat(new Date(), 'yyyy-MM-dd-hh-mm-ss')}`;
      const driver = await getDriver();

      showModal(ConfirmModal, {
        message: `Really create ${driver?.collectionSingularLabel ?? 'collection/container'} copy named ${newName}?`,
        onConfirm: async () => {
          const dbid = _.pick(data, ['conid', 'database']);
          runOperationOnDatabase(dbid, {
            type: 'cloneCollection',
            collection: data.pureName,
            newName,
          });
        },
      });
    } else if (menu.isDuplicateTable) {
      const driver = await getDriver();
      const dmp = driver.createDumper();
      const newTable = _.cloneDeep(data);
      const { conid, database } = data;

      newTable.pureName = `_${newTable.pureName}_${dateFormat(new Date(), 'yyyy-MM-dd-hh-mm-ss')}`;
      newTable.columns.forEach(x => {
        x.autoIncrement = false;
        x.defaultConstraint = null;
      });
      newTable.foreignKeys = [];
      newTable.checks = [];
      newTable.uniques = [];
      newTable.indexes = [];
      if (newTable.primaryKey) {
        newTable.primaryKey.constraintName = null;
      }
      dmp.createTable(newTable);
      dmp.putCmd(
        '^insert ^into %f(%,i) ^select %,i from %f',
        newTable,
        newTable.columns.map(x => x.columnName),
        data.columns.map(x => x.columnName),
        data
      );

      showModal(ConfirmSqlModal, {
        sql: dmp.s,
        onConfirm: async () => {
          saveScriptToDatabase({ conid, database }, dmp.s);
        },
        engine: driver.engine,
      });
    } else if (menu.isImport) {
      const { conid, database } = data;
      showModal(ImportExportModal, {
        initialValues: {
          sourceStorageType: getDefaultFileFormat(getExtensions()).storageType,
          targetStorageType: 'database',
          targetConnectionId: conid,
          targetDatabaseName: database,
          fixedTargetPureName: data.pureName,
        },
      });
    } else {
      openDatabaseObjectDetail(
        menu.tab,
        menu.scriptTemplate,
        data,
        menu.forceNewTab,
        menu.initialData,
        menu.icon,
        data
      );
    }
  }

  function createMenus(objectTypeField, driver): ReturnType<typeof createMenusCore> {
    return createMenusCore(objectTypeField, driver).filter(x => {
      if (x.scriptTemplate) {
        return hasPermission(`dbops/sql-template/${x.scriptTemplate}`);
      }
      if (x.sqlGeneratorProps) {
        return hasPermission(`dbops/sql-generator`);
      }
      return true;
    });
  }

  function getObjectTitle(connection, schemaName, pureName) {
    const driver = findEngineDriver(connection, getExtensions());

    const defaultSchema = driver?.dialect?.defaultSchemaName;
    if (schemaName && defaultSchema && schemaName != defaultSchema) {
      return `${schemaName}.${pureName}`;
    }
    return pureName;
  }

  export async function openDatabaseObjectDetail(
    tabComponent,
    scriptTemplate,
    { schemaName, pureName, conid, database, objectTypeField },
    forceNewTab?,
    initialData?,
    icon?,
    appObjectData?
  ) {
    const connection = await getConnectionInfo({ conid });
    const tooltip = `${getConnectionLabel(connection)}\n${database}\n${fullDisplayName({
      schemaName,
      pureName,
    })}`;

    openNewTab(
      {
        title: scriptTemplate ? 'Query #' : getObjectTitle(connection, schemaName, pureName),
        tooltip,
        icon: icon || (scriptTemplate ? 'img sql-file' : databaseObjectIcons[objectTypeField]),
        tabComponent: scriptTemplate ? 'QueryTab' : tabComponent,
        appObject: 'DatabaseObjectAppObject',
        appObjectData,
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
    const driver = findEngineDriver(data, getExtensions());

    const configuredAction = getCurrentSettings()[`defaultAction.dbObjectClick.${objectTypeField}`];
    const overrideMenu = createMenus(objectTypeField, driver).find(x => x.label && x.label == configuredAction);
    if (overrideMenu) {
      databaseObjectMenuClickHandler(data, overrideMenu);
      return;
    }

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
      null,
      data
    );
  }

  function testEqual(a, b) {
    return (
      a.conid == b.conid &&
      a.database == b.database &&
      a.objectTypeField == b.objectTypeField &&
      a.pureName == b.pureName &&
      a.schemaName == b.schemaName
    );
  }

  export function createDatabaseObjectMenu(data, connection = null) {
    const driver = findEngineDriver(data, getExtensions());

    const { objectTypeField } = data;
    return createMenus(objectTypeField, driver)
      .filter(x => x)
      .map(menu => {
        if (menu.divider) return menu;

        if (menu.isExport) {
          return createQuickExportMenu(
            fmt => async () => {
              const coninfo = await getConnectionInfo(data);
              exportQuickExportFile(
                data.pureName,
                {
                  functionName: menu.functionName,
                  props: {
                    connection: extractShellConnection(coninfo, data.database),
                    ..._.pick(data, ['pureName', 'schemaName']),
                  },
                },
                fmt
              );
            },
            {
              onClick: () => {
                openImportExportTab({
                  sourceStorageType: 'database',
                  sourceConnectionId: data.conid,
                  sourceDatabaseName: data.database,
                  sourceSchemaName: data.schemaName,
                  sourceList: [data.pureName],
                });
                // showModal(ImportExportModal, {
                //   initialValues: {
                //     sourceStorageType: 'database',
                //     sourceConnectionId: data.conid,
                //     sourceDatabaseName: data.database,
                //     sourceSchemaName: data.schemaName,
                //     sourceList: [data.pureName],
                //   },
                // });
              },
            }
          );
        }

        if (connection?.isReadOnly && menu.requiresWriteAccess) {
          return null;
        }
        return {
          text: menu.label,
          onClick: () => {
            databaseObjectMenuClickHandler(data, menu);
          },
        };
      });
  }

  function formatRowCount(value) {
    const num = parseInt(value);
    if (_.isNaN(num)) return value;
    return num.toLocaleString();
  }

  export function createAppObjectMenu(data) {
    return createDatabaseObjectMenu(data);
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import {
    currentDatabase,
    extensions,
    getCurrentSettings,
    getExtensions,
    openedConnections,
    pinnedTables,
  } from '../stores';
  import openNewTab from '../utility/openNewTab';
  import { filterName, generateDbPairingId, getAlterDatabaseScript, getConnectionLabel } from 'dbgate-tools';
  import { getConnectionInfo, getDatabaseInfo } from '../utility/metadataLoaders';
  import fullDisplayName from '../utility/fullDisplayName';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { findEngineDriver } from 'dbgate-tools';
  import uuidv1 from 'uuid/v1';
  import SqlGeneratorModal from '../modals/SqlGeneratorModal.svelte';
  import { exportQuickExportFile } from '../utility/exportFileTools';
  import createQuickExportMenu from '../utility/createQuickExportMenu';
  import ConfirmSqlModal, { runOperationOnDatabase, saveScriptToDatabase } from '../modals/ConfirmSqlModal.svelte';
  import { alterDatabaseDialog, renameDatabaseObjectDialog } from '../utility/alterDatabaseTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import { apiCall } from '../utility/api';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { extractShellConnection } from '../impexp/createImpExpScript';
  import { format as dateFormat } from 'date-fns';
  import { getDefaultFileFormat } from '../plugins/fileformats';
  import hasPermission from '../utility/hasPermission';
  import { openImportExportTab } from '../utility/importExportTools';

  export let data;
  export let passProps;

  function handleClick(forceNewTab = false) {
    handleDatabaseObjectClick(data, forceNewTab);
  }

  function createMenu() {
    return createDatabaseObjectMenu(data, passProps?.connection);
  }

  function getExtInfo(data) {
    const res = [];
    if (data.tableRowCount != null) {
      res.push(`${formatRowCount(data.tableRowCount)} rows`);
    }
    if (data.tableEngine) {
      res.push(data.tableEngine);
    }
    if (res.length > 0) return res.join(', ');
    return null;
  }

  $: isPinned = !!$pinnedTables.find(x => testEqual(data, x));
</script>

<AppObjectCore
  {...$$restProps}
  module={$$props.module}
  {data}
  title={data.schemaName ? `${data.schemaName}.${data.pureName}` : data.pureName}
  icon={databaseObjectIcons[data.objectTypeField]}
  menu={createMenu}
  showPinnedInsteadOfUnpin={passProps?.showPinnedInsteadOfUnpin}
  onPin={isPinned ? null : () => pinnedTables.update(list => [...list, data])}
  onUnpin={isPinned ? () => pinnedTables.update(list => list.filter(x => !testEqual(x, data))) : null}
  extInfo={getExtInfo(data)}
  on:click={() => handleClick()}
  on:middleclick={() => handleClick(true)}
  on:expand
  on:dragstart
  on:dragenter
  on:dragend
  on:drop
/>
