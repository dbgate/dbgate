<script context="module" lang="ts">
  export function buildGridMongoCondition(props) {
    const filters = props?.display?.config?.filters;

    const conditions = [];
    for (const uniqueName in filters || {}) {
      if (!filters[uniqueName]) continue;
      try {
        const ast = parseFilter(filters[uniqueName], 'mongo');
        const cond = _.cloneDeepWith(ast, expr => {
          if (expr.__placeholder__) {
            return {
              [uniqueName]: expr.__placeholder__,
            };
          }
        });
        conditions.push(cond);
      } catch (err) {
        // error in filter
      }
    }

    return conditions.length > 0
      ? {
          $and: conditions,
        }
      : undefined;
  }

  export async function loadCollectionDataPage(props, offset, limit) {
    const { conid, database } = props;

    const response = await axiosInstance.request({
      url: 'database-connections/collection-data',
      method: 'post',
      params: {
        conid,
        database,
      },
      data: {
        options: {
          pureName: props.pureName,
          limit,
          skip: offset,
          condition: buildGridMongoCondition(props),
        },
      },
    });

    if (response.data.errorMessage) return response.data;
    return response.data.rows;
  }

  function dataPageAvailable(props) {
    return true;
    // const { display } = props;
    // const sql = display.getPageQuery(0, 1);
    // return !!sql;
  }

  async function loadRowCount(props) {
    const { conid, database } = props;

    const response = await axiosInstance.request({
      url: 'database-connections/collection-data',
      method: 'post',
      params: {
        conid,
        database,
      },
      data: {
        options: {
          pureName: props.pureName,
          countDocuments: true,
          condition: buildGridMongoCondition(props),
        },
      },
    });

    return response.data.count;
  }
</script>

<script lang="ts">
  import { changeSetToSql, createChangeSet } from 'dbgate-datalib';
  import { parseFilter } from 'dbgate-filterparser';
  import { scriptToSql } from 'dbgate-sqltree';
  import _ from 'lodash';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import ConfirmNoSqlModal from '../modals/ConfirmNoSqlModal.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';

  import axiosInstance from '../utility/axiosInstance';
  import openNewTab from '../utility/openNewTab';
  import ChangeSetGrider from './ChangeSetGrider';

  import LoadingDataGridCore from './LoadingDataGridCore.svelte';

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
  export let selectedCellsPublished;

  // export let onChangeGrider = undefined;

  export let loadedRows = [];

  // $: console.log('loadedRows BIND', loadedRows);
  $: grider = new ChangeSetGrider(
    loadedRows,
    changeSetState,
    dispatchChangeSet,
    display,
    macroPreview,
    macroValues,
    selectedCellsPublished
  );
  // $: console.log('GRIDER', grider);
  // $: if (onChangeGrider) onChangeGrider(grider);

  async function handleConfirmChange(changeSet) {
    const resp = await axiosInstance.request({
      url: 'database-connections/update-collection',
      method: 'post',
      params: {
        conid,
        database,
      },
      data: { changeSet },
    });
    const { errorMessage } = resp.data || {};
    if (errorMessage) {
      showModal(ErrorMessageModal, { title: 'Error when saving', message: errorMessage });
    } else {
      dispatchChangeSet({ type: 'reset', value: createChangeSet() });
      display.reload();
    }
  }

  function handleSave() {
    const json = changeSetState && changeSetState.value;
    showModal(ConfirmNoSqlModal, {
      json,
      onConfirm: () => handleConfirmChange(json),
      engine: display.engine,
    });
  }

  function exportGrid() {
    const initialValues: any = {};
    initialValues.sourceStorageType = 'query';
    initialValues.sourceConnectionId = conid;
    initialValues.sourceDatabaseName = database;
    initialValues.sourceSql = display.getExportQuery();
    initialValues.sourceList = display.baseTable ? [display.baseTable.pureName] : [];
    showModal(ImportExportModal, { initialValues });
  }

  function openQuery() {
    openNewTab(
      {
        title: 'Query #',
        icon: 'img sql-file',
        tabComponent: 'QueryTab',
        props: {
          schemaName: display.baseTable.schemaName,
          pureName: display.baseTable.pureName,
          conid,
          database,
        },
      },
      {
        editor: display.getExportQuery(),
      }
    );
  }

  function openActiveChart() {
    openNewTab(
      {
        title: 'Chart #',
        icon: 'img chart',
        tabComponent: 'ChartTab',
        props: {
          conid,
          database,
        },
      },
      {
        editor: {
          config: { chartType: 'bar' },
          sql: display.getExportQuery(select => {
            select.orderBy = null;
          }),
        },
      }
    );
  }
</script>

<LoadingDataGridCore
  {...$$props}
  loadDataPage={loadCollectionDataPage}
  {dataPageAvailable}
  {loadRowCount}
  onExportGrid={exportGrid}
  onOpenQuery={openQuery}
  onOpenActiveChart={openActiveChart}
  bind:loadedRows
  frameSelection={!!macroPreview}
  {grider}
  onSave={handleSave}
/>
