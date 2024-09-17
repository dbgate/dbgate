<script context="module" lang="ts">
  const getCurrentEditor = () => getActiveComponent('JslDataGridCore');

  registerCommand({
    id: 'jslTableGrid.export',
    category: 'Data grid',
    name: 'Export',
    icon: 'icon export',
    keyText: 'CtrlOrCommand+E',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().exportGrid(),
  });

  async function loadDataPage(props, offset, limit) {
    const { jslid, display, formatterFunction } = props;

    const response = await apiCall('jsldata/get-rows', {
      jslid,
      offset,
      limit,
      formatterFunction,
      filters: display ? display.compileJslFilters() : null,
      sort: display.config.sort,
    });

    return response;
  }

  function dataPageAvailable(props) {
    return true;
  }

  async function loadRowCount(props) {
    const { jslid } = props;

    const response = await apiCall('jsldata/get-stats', { jslid });
    return response.rowCount;
  }

  export let formatterPlugin;
  export let formatterFunction;
</script>

<script lang="ts">
  import _ from 'lodash';
  import { registerQuickExportHandler } from '../buttons/ToolStripExportButton.svelte';
  import registerCommand from '../commands/registerCommand';
  import { apiCall, apiOff, apiOn } from '../utility/api';

  import { registerMenu } from '../utility/contextMenu';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import createQuickExportMenu from '../utility/createQuickExportMenu';
  import { exportQuickExportFile } from '../utility/exportFileTools';
  import useEffect from '../utility/useEffect';
  import ChangeSetGrider from './ChangeSetGrider';

  import LoadingDataGridCore from './LoadingDataGridCore.svelte';
  import { openImportExportTab } from '../utility/importExportTools';

  export let jslid;
  export let display;
  export let formatterFunction;

  export let changeSetState;
  export let dispatchChangeSet;

  export let macroPreview;
  export let macroValues;
  export let onPublishedCellsChanged;
  export const activator = createActivator('JslDataGridCore', false);

  export let setLoadedRows;

  let publishedCells = [];

  let loadedRows = [];
  let domGrid;

  let changeIndex = 0;
  let rowCountLoaded = null;

  const throttleLoadNext = _.throttle(() => domGrid?.resetLoadedAll(), 500);

  const handleJslDataStats = stats => {
    if (stats.changeIndex < changeIndex) return;
    changeIndex = stats.changeIndex;
    rowCountLoaded = stats.rowCount;
    throttleLoadNext();
  };

  $: effect = useEffect(() => onJslId(jslid));
  function onJslId(jslidVal) {
    if (jslidVal) {
      apiOn(`jsldata-stats-${jslidVal}`, handleJslDataStats);
      return () => {
        apiOff(`jsldata-stats-${jslidVal}`, handleJslDataStats);
      };
    } else {
      return () => {};
    }
  }
  $: $effect;

  let grider;

  $: {
    if (macroPreview) {
      grider = new ChangeSetGrider(
        loadedRows,
        changeSetState,
        dispatchChangeSet,
        display,
        macroPreview,
        macroValues,
        publishedCells,
        true
      );
    }
  }

  $: {
    if (!macroPreview) {
      grider = new ChangeSetGrider(
        loadedRows,
        changeSetState,
        dispatchChangeSet,
        display,
        undefined,
        undefined,
        undefined,
        true
      );
    }
  }

  // $: grider = new RowsArrayGrider(loadedRows);

  export function exportGrid() {
    const initialValues = {} as any;
    const archiveMatch = jslid.match(/^archive:\/\/([^/]+)\/(.*)$/);
    if (archiveMatch) {
      initialValues.sourceStorageType = 'archive';
      initialValues.sourceArchiveFolder = archiveMatch[1];
      initialValues.sourceList = [archiveMatch[2]];
      initialValues[`columns_${archiveMatch[2]}`] = display.getExportColumnMap();
    } else {
      initialValues.sourceStorageType = 'jsldata';
      initialValues.sourceJslId = jslid;
      initialValues.sourceList = ['query-data'];
      initialValues[`columns_query-data`] = display.getExportColumnMap();
    }
    openImportExportTab(initialValues);
    // showModal(ImportExportModal, { initialValues });
  }

  const quickExportHandler = fmt => async () => {
    const archiveMatch = jslid.match(/^archive:\/\/([^/]+)\/(.*)$/);
    if (archiveMatch) {
      exportQuickExportFile(
        archiveMatch[2],
        {
          functionName: 'archiveReader',
          props: {
            folderName: archiveMatch[1],
            fileName: archiveMatch[2],
          },
        },
        fmt,
        display.getExportColumnMap()
      );
    } else {
      exportQuickExportFile(
        'Query',
        {
          functionName: 'jslDataReader',
          props: {
            jslid,
          },
        },
        fmt,
        display.getExportColumnMap()
      );
    }
  };
  registerQuickExportHandler(quickExportHandler);

  registerMenu(() =>
    createQuickExportMenu(
      quickExportHandler,
      {
        command: 'jslTableGrid.export',
      },
      { tag: 'export' }
    )
  );

  function handleSetLoadedRows(rows) {
    loadedRows = rows;
    setLoadedRows?.(rows);
  }
</script>

<LoadingDataGridCore
  bind:this={domGrid}
  {...$$props}
  setLoadedRows={handleSetLoadedRows}
  onPublishedCellsChanged={value => {
    publishedCells = value;
    if (onPublishedCellsChanged) {
      onPublishedCellsChanged(value);
    }
  }}
  {loadDataPage}
  {dataPageAvailable}
  {loadRowCount}
  {grider}
  {rowCountLoaded}
/>
