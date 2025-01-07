<script context="module" lang="ts">
  const getCurrentEditor = () => getActiveComponent('CollectionDataGridCore');

  registerCommand({
    id: 'collectionDataGrid.openQuery',
    category: 'Data grid',
    name: 'Open query',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().openQuery(),
  });

  registerCommand({
    id: 'collectionDataGrid.export',
    category: 'Data grid',
    name: 'Export',
    keyText: 'CtrlOrCommand+E',
    icon: 'icon export',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().exportGrid(),
  });

  function buildConditionForGrid(props) {
    const filters = props?.display?.config?.filters;
    const filterBehaviour =
      props?.display?.driver?.getFilterBehaviour(null, standardFilterBehaviours) ?? mongoFilterBehaviour;

    // console.log('USED FILTER BEHAVIOUR', filterBehaviour);

    const conditions = [];
    for (const uniqueName in filters || {}) {
      if (!filters[uniqueName]) continue;
      try {
        const ast = parseFilter(filters[uniqueName], filterBehaviour);
        // console.log('AST', ast);
        const cond = _.cloneDeepWith(ast, expr => {
          if (expr.exprType == 'placeholder') {
            return {
              exprType: 'column',
              columnName: uniqueName,
            };
          }

          // if (expr.__placeholder__) {
          //   return {
          //     [uniqueName]: expr.__placeholder__,
          //   };
          // }
        });
        conditions.push(cond);
      } catch (err) {
        // error in filter
      }
    }

    return conditions.length > 0
      ? {
          conditionType: 'and',
          conditions,
        }
      : undefined;
  }

  function buildSortForGrid(props) {
    const sort = props?.display?.config?.sort;

    if (sort?.length > 0) {
      return sort.map(col => ({
        columnName: col.uniqueName,
        direction: col.order,
      }));
    }

    return null;
  }

  export async function loadCollectionDataPage(props, offset, limit) {
    const { conid, database } = props;

    const response = await apiCall('database-connections/collection-data', {
      conid,
      database,
      options: {
        pureName: props.pureName,
        limit,
        skip: offset,
        condition: buildConditionForGrid(props),
        sort: buildSortForGrid(props),
      },
    });

    if (response.errorMessage) return response;
    return response.rows;
  }

  function dataPageAvailable(props) {
    return true;
    // const { display } = props;
    // const sql = display.getPageQuery(0, 1);
    // return !!sql;
  }

  async function loadRowCount(props) {
    const { conid, database } = props;

    const response = await apiCall('database-connections/collection-data', {
      conid,
      database,
      options: {
        pureName: props.pureName,
        countDocuments: true,
        condition: buildConditionForGrid(props),
      },
    });

    return response.count;
  }
</script>

<script lang="ts">
  import { parseFilter } from 'dbgate-filterparser';
  import _ from 'lodash';
  import { registerQuickExportHandler } from '../buttons/ToolStripExportButton.svelte';
  import registerCommand from '../commands/registerCommand';
  import { extractShellConnection } from '../impexp/createImpExpScript';
  import { apiCall } from '../utility/api';

  import { registerMenu } from '../utility/contextMenu';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import createQuickExportMenu from '../utility/createQuickExportMenu';
  import { exportQuickExportFile } from '../utility/exportFileTools';
  import { getConnectionInfo } from '../utility/metadataLoaders';
  import openNewTab from '../utility/openNewTab';
  import ChangeSetGrider from './ChangeSetGrider';

  import LoadingDataGridCore from './LoadingDataGridCore.svelte';
  import { mongoFilterBehaviour, standardFilterBehaviours } from 'dbgate-tools';
  import { openImportExportTab } from '../utility/importExportTools';

  export let conid;
  export let display;
  export let database;
  export let schemaName;
  export let pureName;
  export let config;
  export let changeSetState;
  export let dispatchChangeSet;

  export let macroPreview;
  export let macroValues;
  export let setLoadedRows = null;
  export let onPublishedCellsChanged;

  // export let onChangeGrider = undefined;

  let loadedRows = [];
  let publishedCells = [];

  export const activator = createActivator('CollectionDataGridCore', false);

  // $: console.log('loadedRows BIND', loadedRows);
  $: grider = new ChangeSetGrider(
    loadedRows,
    changeSetState,
    dispatchChangeSet,
    display,
    macroPreview,
    macroValues,
    publishedCells
  );
  // $: console.log('GRIDER', grider);
  // $: if (onChangeGrider) onChangeGrider(grider);

  function getExportQuery() {
    return display?.driver?.getCollectionExportQueryScript?.(
      pureName,
      buildConditionForGrid($$props),
      buildSortForGrid($$props)
    );
    // return `db.collection('${pureName}')
    //   .find(${JSON.stringify(buildConditionForGrid($$props) || {})})
    //   .sort(${JSON.stringify(buildMongoSort($$props) || {})})`;
  }

  function getExportQueryJson() {
    return display?.driver?.getCollectionExportQueryJson?.(
      pureName,
      buildConditionForGrid($$props),
      buildSortForGrid($$props)
    );
    // return {
    //   collection: pureName,
    //   condition: buildConditionForGrid($$props) || {},
    //   sort: buildMongoSort($$props) || {},
    // };
  }

  export async function exportGrid() {
    const coninfo = await getConnectionInfo({ conid });
    const initialValues: any = {};
    initialValues.sourceStorageType = 'query';
    initialValues.sourceConnectionId = conid;
    initialValues.sourceDatabaseName = database;
    initialValues.sourceQuery = coninfo.isReadOnly
      ? JSON.stringify(getExportQueryJson(), undefined, 2)
      : getExportQuery();
    initialValues.sourceQueryType = coninfo.isReadOnly ? 'json' : 'native';
    initialValues.sourceList = [pureName];
    initialValues[`columns_${pureName}`] = display.getExportColumnMap();
    openImportExportTab(initialValues);
    // showModal(ImportExportModal, { initialValues });
  }

  export function openQuery() {
    openNewTab(
      {
        title: 'Query #',
        icon: 'img sql-file',
        tabComponent: 'QueryTab',
        focused: true,
        props: {
          conid,
          database,
        },
      },
      {
        editor: getExportQuery(),
      }
    );
  }

  const quickExportHandler = fmt => async () => {
    const coninfo = await getConnectionInfo({ conid });
    exportQuickExportFile(
      pureName || 'Data',
      {
        functionName: 'queryReader',
        props: {
          connection: extractShellConnection(coninfo, database),
          queryType: coninfo.isReadOnly ? 'json' : 'native',
          query: coninfo.isReadOnly ? getExportQueryJson() : getExportQuery(),
        },
      },
      fmt,
      display.getExportColumnMap()
    );
  };

  registerQuickExportHandler(quickExportHandler);

  registerMenu({ command: 'collectionDataGrid.openQuery', tag: 'export' }, () =>
    createQuickExportMenu(
      quickExportHandler,
      {
        command: 'collectionDataGrid.export',
      },
      { tag: 'export' }
    )
  );

  function handleSetLoadedRows(rows) {
    loadedRows = rows;
    if (setLoadedRows) setLoadedRows(rows);
  }
</script>

<LoadingDataGridCore
  {...$$props}
  loadDataPage={loadCollectionDataPage}
  {dataPageAvailable}
  {loadRowCount}
  setLoadedRows={handleSetLoadedRows}
  onPublishedCellsChanged={value => {
    publishedCells = value;
    if (onPublishedCellsChanged) {
      onPublishedCellsChanged(value);
    }
  }}
  frameSelection={!!macroPreview}
  onOpenQuery={openQuery}
  {grider}
/>
