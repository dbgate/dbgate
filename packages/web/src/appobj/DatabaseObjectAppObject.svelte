<script lang="ts" context="module">
  import { copyTextToClipboard } from '../utility/clipboard';

  export const extractKey = ({ schemaName, pureName }) => (schemaName ? `${schemaName}.${pureName}` : pureName);
  export const createMatcher =
    (filter, cfg = DEFAULT_OBJECT_SEARCH_SETTINGS) =>
    ({ schemaName, pureName, objectComment, tableEngine, columns, objectTypeField, tableName, createSql }) => {
      const mainArgs = [];
      const childArgs = [];
      if (cfg.schemaName) mainArgs.push(schemaName);
      if (cfg.pureName) mainArgs.push(pureName);
      if (objectTypeField == 'tables') {
        if (cfg.tableComment) mainArgs.push(objectComment);
        if (cfg.tableEngine) mainArgs.push(tableEngine);

        for (const column of columns || []) {
          if (cfg.columnName) childArgs.push(column.columnName);
          if (cfg.columnComment) childArgs.push(column.columnComment);
          if (cfg.columnDataType) childArgs.push(column.dataType);
        }
      } else {
        if (cfg.sqlObjectText) childArgs.push(createSql);
      }
      if (objectTypeField == 'triggers' && cfg.pureName) {
        mainArgs.push(tableName);
      }

      const res = filterNameCompoud(filter, mainArgs, childArgs);
      return res;
    };

  export const disableShowChildrenWithParentMatch = true;

  export const createTitle = ({ schemaName, pureName }) => (schemaName ? `${schemaName}.${pureName}` : pureName);

  export const databaseObjectIcons = {
    tables: 'img table',
    collections: 'img collection',
    views: 'img view',
    matviews: 'img view',
    procedures: 'img procedure',
    functions: 'img function',
    queries: 'img query-data',
    triggers: 'icon trigger',
    schedulerEvents: 'icon scheduler-event',
  };

  const defaultTabs = {
    tables: 'TableDataTab',
    collections: 'CollectionDataTab',
    views: 'ViewDataTab',
    matviews: 'ViewDataTab',
    queries: 'QueryDataTab',
    procedures: 'SqlObjectTab',
    functions: 'SqlObjectTab',
    triggers: 'SqlObjectTab',
  };

  function createScriptTemplatesSubmenu(objectTypeField) {
    return {
      label: 'SQL template',
      submenu: getSupportedScriptTemplates(objectTypeField),
    };
  }

  interface DbObjMenuItem {
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
    isShowSql?: boolean;
    scriptTemplate?: string;
    sqlGeneratorProps?: any;
    isDropCollection?: boolean;
    isRenameCollection?: boolean;
    isDuplicateCollection?: boolean;
    isDisableEvent?: boolean;
    isEnableEvent?: boolean;
    submenu?: DbObjMenuItem[];
  }

  function createMenusCore(objectTypeField, driver, data): DbObjMenuItem[] {
    switch (objectTypeField) {
      case 'tables':
        return [
          ...defaultDatabaseObjectAppObjectActions['tables'],
          {
            divider: true,
          },
          isProApp() && {
            label: 'Design query',
            isQueryDesigner: true,
            requiresWriteAccess: true,
          },
          isProApp() && {
            label: 'Design perspective query',
            tab: 'PerspectiveTab',
            forceNewTab: true,
            icon: 'img perspective',
          },
          createScriptTemplatesSubmenu('tables'),
          {
            label: 'SQL generator',
            submenu: [
              {
                label: 'CREATE TABLE',
                sqlGeneratorProps: {
                  createTables: true,
                  createIndexes: true,
                  createForeignKeys: true,
                },
              },
              {
                label: 'DROP TABLE',
                sqlGeneratorProps: {
                  dropTables: true,
                  dropReferences: true,
                },
              },
              {
                label: 'INSERT',
                sqlGeneratorProps: {
                  insert: true,
                },
              },
            ],
          },
          {
            divider: true,
          },
          hasPermission('dbops/model/edit') && {
            label: 'Drop table',
            isDrop: true,
            requiresWriteAccess: true,
          },
          hasPermission('dbops/table/rename') &&
            !driver?.dialect.disableRenameTable && {
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
        ];
      case 'views':
        return [
          ...defaultDatabaseObjectAppObjectActions['views'],
          {
            divider: true,
          },
          isProApp() && {
            label: 'Design query',
            isQueryDesigner: true,
          },
          isProApp() && {
            label: 'Design perspective query',
            tab: 'PerspectiveTab',
            forceNewTab: true,
            icon: 'img perspective',
          },
          createScriptTemplatesSubmenu('views'),
          {
            label: 'SQL generator',
            submenu: [
              {
                label: 'CREATE VIEW',
                sqlGeneratorProps: {
                  createViews: true,
                },
              },
              {
                label: 'DROP VIEW',
                sqlGeneratorProps: {
                  dropViews: true,
                },
              },
            ],
          },
          {
            divider: true,
          },
          hasPermission('dbops/model/edit') && {
            label: 'Drop view',
            isDrop: true,
            requiresWriteAccess: true,
          },
          hasPermission('dbops/model/edit') && {
            label: 'Rename view',
            isRename: true,
            requiresWriteAccess: true,
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
        ];
      case 'matviews':
        return [
          ...defaultDatabaseObjectAppObjectActions['matviews'],
          {
            divider: true,
          },
          hasPermission('dbops/model/edit') && {
            label: 'Drop view',
            isDrop: true,
            requiresWriteAccess: true,
          },
          hasPermission('dbops/model/edit') && {
            label: 'Rename view',
            isRename: true,
            requiresWriteAccess: true,
          },
          {
            divider: true,
          },
          {
            label: 'Query designer',
            isQueryDesigner: true,
          },
          createScriptTemplatesSubmenu('matviews'),
          {
            label: 'SQL generator',
            submenu: [
              {
                label: 'CREATE MATERIALIZED VIEW',
                sqlGeneratorProps: {
                  createMatviews: true,
                },
              },
              {
                label: 'DROP MATERIALIZED VIEW',
                sqlGeneratorProps: {
                  dropMatviews: true,
                },
              },
            ],
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
          ...defaultDatabaseObjectAppObjectActions['procedures'],
          {
            divider: true,
          },
          hasPermission('dbops/model/edit') && {
            label: 'Drop procedure',
            isDrop: true,
            requiresWriteAccess: true,
          },
          hasPermission('dbops/model/edit') && {
            label: 'Rename procedure',
            isRename: true,
            requiresWriteAccess: true,
          },
          createScriptTemplatesSubmenu('procedures'),
          {
            label: 'SQL generator',
            submenu: [
              {
                label: 'CREATE PROCEDURE',
                sqlGeneratorProps: {
                  createProcedures: true,
                },
              },
              {
                label: 'DROP PROCEDURE',
                sqlGeneratorProps: {
                  dropProcedures: true,
                },
              },
            ],
          },
        ];
      case 'functions':
        return [...defaultDatabaseObjectAppObjectActions['functions']];
      case 'triggers':
        return [
          ...defaultDatabaseObjectAppObjectActions['triggers'],
          hasPermission('dbops/model/edit') && {
            label: 'Drop trigger',
            isDrop: true,
            requiresWriteAccess: true,
          },
          {
            divider: true,
          },
          {
            label: 'SQL generator',
            submenu: [
              {
                label: 'CREATE TRIGGER',
                sqlGeneratorProps: {
                  createTriggers: true,
                },
              },
              {
                label: 'DROP TRIGGER',
                sqlGeneratorProps: {
                  dropTriggers: true,
                },
              },
            ],
          },
        ];
      case 'collections':
        return [
          ...defaultDatabaseObjectAppObjectActions['collections'],
          {
            divider: true,
          },
          isProApp() && {
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
      case 'schedulerEvents':
        const menu: DbObjMenuItem[] = [
          ...defaultDatabaseObjectAppObjectActions['schedulerEvents'],
          hasPermission('dbops/model/edit') && {
            label: 'Drop event',
            isDrop: true,
            requiresWriteAccess: true,
          },
        ];

        if (data?.status === 'ENABLED') {
          menu.push({
            label: 'Disable',
            isDisableEvent: true,
          });
        } else {
          menu.push({
            label: 'Enable',
            isEnableEvent: true,
          });
        }

        menu.push(
          {
            divider: true,
          },
          {
            label: 'SQL generator',
            submenu: [
              {
                label: 'CREATE SCHEDULER EVENT',
                sqlGeneratorProps: {
                  createSchedulerEvents: true,
                },
              },
              {
                label: 'DROP SCHEDULER EVENT',
                sqlGeneratorProps: {
                  dropSchedulerEvents: true,
                },
              },
            ],
          }
        );

        return menu;
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
          focused: true,
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
    } else if (menu.isDisableEvent) {
      const { conid, database, pureName } = data;
      const driver = await getDriver();
      const dmp = driver.createDumper();
      dmp.put('^alter ^event %i ^disable', pureName);

      const sql = dmp.s;

      showModal(ConfirmSqlModal, {
        sql,
        onConfirm: async () => {
          saveScriptToDatabase({ conid, database }, sql);
        },
        engine: driver.engine,
      });
    } else if (menu.isEnableEvent) {
      const { conid, database, pureName } = data;
      const driver = await getDriver();
      const dmp = driver.createDumper();
      dmp.put('^alter ^event %i ^enable', pureName);

      const sql = dmp.s;

      showModal(ConfirmSqlModal, {
        sql,
        onConfirm: async () => {
          saveScriptToDatabase({ conid, database }, sql);
        },
        engine: driver.engine,
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
      openImportExportTab({
        sourceStorageType: getDefaultFileFormat(getExtensions()).storageType,
        targetStorageType: 'database',
        targetConnectionId: conid,
        targetDatabaseName: extractDbNameFromComposite(database),
        targetSchemaName: data.schemaName,
        sourceList: ['__TEMPLATE__'],
        targetName___TEMPLATE__: data.pureName,
        // fixedTargetPureName: data.pureName,
      });
      // showModal(ImportExportModal, {
      //   initialValues: {
      //     sourceStorageType: getDefaultFileFormat(getExtensions()).storageType,
      //     targetStorageType: 'database',
      //     targetConnectionId: conid,
      //     targetDatabaseName: database,
      //     fixedTargetPureName: data.pureName,
      //   },
      // });
      // } else if (menu.isShowSql) {
      //   openNewTab({
      //     title: data.pureName,
      //     icon: 'img sql-file',
      //     tabComponent: 'SqlObjectTab',
      //     tabPreviewMode: true,
      //     props: {
      //       conid: data.conid,
      //       database: data.database,
      //       schemaName: data.schemaName,
      //       pureName: data.pureName,
      //       objectTypeField: data.objectTypeField,
      //     },
      //   });
    } else {
      openDatabaseObjectDetail(
        menu.tab,
        menu.scriptTemplate,
        { ...data, defaultActionId: menu.defaultActionId, isRawMode: menu.isRawMode },
        menu.forceNewTab,
        menu.initialData,
        menu.icon,
        data,
        !!menu.defaultActionId
      );
    }
  }

  function createMenus(objectTypeField, driver, data): ReturnType<typeof createMenusCore> {
    return createMenusCore(objectTypeField, driver, data).filter(x => {
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
    { schemaName, pureName, conid, database, objectTypeField, defaultActionId, isRawMode },
    forceNewTab?,
    initialData?,
    icon?,
    appObjectData?,
    tabPreviewMode?
  ) {
    const connection = await getConnectionInfo({ conid });
    const tooltip = `${getConnectionLabel(connection)}\n${database}\n${fullDisplayName({
      schemaName,
      pureName,
    })}`;

    openNewTab(
      {
        // title: getObjectTitle(connection, schemaName, pureName),
        title: tabComponent ? getObjectTitle(connection, schemaName, pureName) : 'Query #',
        focused: tabComponent == null,
        tooltip,
        icon:
          icon ||
          (scriptTemplate || tabComponent == 'SqlObjectTab' ? 'img sql-file' : databaseObjectIcons[objectTypeField]),
        tabComponent: tabComponent ?? 'QueryTab',
        appObject: 'DatabaseObjectAppObject',
        appObjectData,
        tabPreviewMode,
        props: {
          schemaName,
          pureName,
          conid,
          database,
          objectTypeField,
          initialArgs: scriptTemplate ? { scriptTemplate } : null,
          defaultActionId,
          isRawMode,
        },
      },
      initialData,
      { forceNewTab }
    );

    if (tabPreviewMode && defaultActionId && getBoolSettingsValue('defaultAction.useLastUsedAction', true)) {
      lastUsedDefaultActions.update(actions => ({
        ...actions,
        [objectTypeField]: defaultActionId,
      }));
      // apiCall('config/update-settings', {
      //   [`defaultAction.dbObjectClick.${objectTypeField}`]: defaultActionId,
      // });
    }
  }

  export function handleDatabaseObjectClick(
    data,
    { forceNewTab = false, tabPreviewMode = false, focusTab = false } = {}
  ) {
    const { schemaName, pureName, conid, database, objectTypeField } = data;
    const driver = findEngineDriver(data, getExtensions());

    const activeTab = getActiveTab();
    const activeTabProps = activeTab?.props || {};
    // const activeDefaultActionId = activeTab?.props?.defaultActionId;

    if (matchDatabaseObjectAppObject(data, activeTabProps)) {
      if (!tabPreviewMode) {
        openedTabs.update(tabs => {
          return tabs.map(tab => ({
            ...tab,
            tabPreviewMode: tab.tabid == activeTab.tabid ? false : tab.tabPreviewMode,
            focused: focusTab && tab.tabid == activeTab.tabid ? true : tab.focused,
          }));
        });
      }
      return;
    }

    const availableDefaultActions = defaultDatabaseObjectAppObjectActions[objectTypeField] ?? [];

    const configuredActionId = getLastUsedDefaultActions()[objectTypeField];
    const prefferedAction =
      // availableDefaultActions.find(x => x.defaultActionId == activeDefaultActionId) ??
      availableDefaultActions.find(x => x.defaultActionId == configuredActionId) ?? availableDefaultActions[0];

    // console.log('activeTab', activeTab);

    // const overrideMenu = createMenus(objectTypeField, driver).find(x => x.label && x.label == configuredAction);
    // if (overrideMenu) {
    //   databaseObjectMenuClickHandler(data, overrideMenu);
    //   return;
    // }

    openDatabaseObjectDetail(
      prefferedAction.tab,
      activeTabProps?.scriptTemplate,
      {
        schemaName,
        pureName,
        conid,
        database,
        objectTypeField,
        defaultActionId: prefferedAction.defaultActionId,
        isRawMode: prefferedAction?.isRawMode ?? false,
      },
      forceNewTab,
      prefferedAction?.initialData,
      prefferedAction.icon,
      data,
      tabPreviewMode
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

  function menuItemMapper(menu, data, connection) {
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
              sourceDatabaseName: extractDbNameFromComposite(data.database),
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

    if (menu.submenu) {
      return {
        ...menu,
        submenu: menu.submenu.map(x => menuItemMapper(x, data, connection)),
      };
    }

    return {
      text: menu.label,
      onClick: () => {
        databaseObjectMenuClickHandler(data, menu);
      },
      iconAlt: menu.defaultActionId ? 'icon open-in-new' : null,
      onClickAlt: menu.defaultActionId
        ? () => {
            databaseObjectMenuClickHandler(data, { ...menu, forceNewTab: true, defaultActionId: null });
          }
        : null,
      isBold:
        data.objectTypeField &&
        menu.defaultActionId &&
        getLastUsedDefaultActions()[data.objectTypeField] == menu.defaultActionId,
    };
  }

  export function createDatabaseObjectMenu(data, connection = null) {
    const driver = findEngineDriver(data, getExtensions());

    const { objectTypeField } = data;
    return createMenus(objectTypeField, driver, data)
      .filter(x => x)
      .map(menu => menuItemMapper(menu, data, connection));
  }

  function formatRowCount(value) {
    const num = parseInt(value);
    if (_.isNaN(num)) return value;
    return num.toLocaleString();
  }

  export function createAppObjectMenu(data) {
    return createDatabaseObjectMenu(data);
  }

  export function handleObjectClick(data, clickAction) {
    //   on:click={() => handleObjectClick(data, { tabPreviewMode: true })}
    // on:middleclick={() => handleObjectClick(data, { forceNewTab: true })}
    // on:dblclick={() => handleObjectClick(data, { tabPreviewMode: false, focusTab: true })}
    const openDetailOnArrows = getOpenDetailOnArrowsSettings();

    let forceNewTab = false;
    let tabPreviewMode = false;
    let focusTab = false;

    switch (clickAction) {
      case 'leftClick':
        tabPreviewMode = true;
        break;
      case 'middleClick':
        forceNewTab = true;
        break;
      case 'dblClick':
        focusTab = true;
        break;
      case 'keyEnter':
        focusTab = true;
        break;
      case 'keyArrow':
        if (!openDetailOnArrows) return;
        tabPreviewMode = true;
        break;
    }

    return handleDatabaseObjectClick(data, { forceNewTab, tabPreviewMode, focusTab });
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import {
    DEFAULT_OBJECT_SEARCH_SETTINGS,
    getActiveTab,
    getExtensions,
    getLastUsedDefaultActions,
    lastUsedDefaultActions,
    openedTabs,
    pinnedTables,
    selectedDatabaseObjectAppObject,
  } from '../stores';
  import openNewTab from '../utility/openNewTab';
  import { extractDbNameFromComposite, filterNameCompoud, getConnectionLabel } from 'dbgate-tools';
  import { getConnectionInfo } from '../utility/metadataLoaders';
  import fullDisplayName from '../utility/fullDisplayName';
  import { showModal } from '../modals/modalTools';
  import { findEngineDriver } from 'dbgate-tools';
  import uuidv1 from 'uuid/v1';
  import SqlGeneratorModal from '../modals/SqlGeneratorModal.svelte';
  import { exportQuickExportFile } from '../utility/exportFileTools';
  import createQuickExportMenu from '../utility/createQuickExportMenu';
  import ConfirmSqlModal, { runOperationOnDatabase, saveScriptToDatabase } from '../modals/ConfirmSqlModal.svelte';
  import { alterDatabaseDialog, renameDatabaseObjectDialog } from '../utility/alterDatabaseTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { extractShellConnection } from '../impexp/createImpExpScript';
  import { format as dateFormat } from 'date-fns';
  import { getDefaultFileFormat } from '../plugins/fileformats';
  import hasPermission from '../utility/hasPermission';
  import { openImportExportTab } from '../utility/importExportTools';
  import { defaultDatabaseObjectAppObjectActions, matchDatabaseObjectAppObject } from './appObjectTools';
  import { getSupportedScriptTemplates } from '../utility/applyScriptTemplate';
  import { getBoolSettingsValue, getOpenDetailOnArrowsSettings } from '../settings/settingsTools';
  import { isProApp } from '../utility/proTools';

  export let data;
  export let passProps;

  function createMenu() {
    return createDatabaseObjectMenu(data, passProps?.connection);
  }

  function getExtInfo(data) {
    const res = [];
    if (data.objectTypeField === 'triggers') {
      res.push(`${data.tableName}, ${data.triggerTiming?.toLowerCase() ?? ''} ${data.eventType?.toLowerCase() ?? ''}`);
    }

    if (data.objectTypeField == 'schedulerEvents') {
      if (data.eventType == 'RECURRING') {
        res.push(`${data.status}, ${data.eventType}, ${data.intervalValue} ${data.intervalField}`);
      } else {
        res.push(`${data.status}, ${data.eventType}, ${data.executeAt}`);
      }
    }

    if (data.objectComment) {
      res.push(data.objectComment);
    }
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
  title={data.schemaName && !passProps?.hideSchemaName ? `${data.schemaName}.${data.pureName}` : data.pureName}
  icon={databaseObjectIcons[data.objectTypeField]}
  menu={createMenu}
  showPinnedInsteadOfUnpin={passProps?.showPinnedInsteadOfUnpin}
  onPin={passProps?.ingorePin ? null : isPinned ? null : () => pinnedTables.update(list => [...list, data])}
  onUnpin={passProps?.ingorePin
    ? null
    : isPinned
      ? () => pinnedTables.update(list => list.filter(x => !testEqual(x, data)))
      : null}
  extInfo={getExtInfo(data)}
  isChoosed={matchDatabaseObjectAppObject($selectedDatabaseObjectAppObject, data)}
  on:click={() => handleObjectClick(data, 'leftClick')}
  on:middleclick={() => handleObjectClick(data, 'middleClick')}
  on:dblclick={() => handleObjectClick(data, 'dblClick')}
  on:expand
  on:dragstart
  on:dragenter
  on:dragend
  on:drop
  on:mousedown={() => {
    $selectedDatabaseObjectAppObject = _.pick(data, ['conid', 'database', 'objectTypeField', 'pureName', 'schemaName']);
  }}
/>
