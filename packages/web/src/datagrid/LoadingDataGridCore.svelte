<script lang="ts">
  import { getIntSettingsValue } from '../settings/settingsTools';

  import createRef from '../utility/createRef';
  import { useSettings } from '../utility/metadataLoaders';

  import DataGridCore from './DataGridCore.svelte';

  export let loadDataPage;
  export let dataPageAvailable;
  export let loadRowCount;
  export let grider;
  export let display;
  export let masterLoadedTime = undefined;
  export let rowCountLoaded = null;

  export let preprocessLoadedRow = null;
  export let setLoadedRows = null;
  export let isRawMode = false;

  // export let griderFactory;

  let loadedRows = [];
  let isLoading = false;
  let isLoadedAll = false;
  let loadedTime = new Date().getTime();
  let allRowCount = null;
  let errorMessage = null;
  let domGrid;

  const loadNextDataRef = createRef(false);
  const loadedTimeRef = createRef(null);

  export function resetLoadedAll() {
    isLoadedAll = false;
    domGrid.loadNextDataIfNeeded();
  }

  const handleLoadRowCount = async () => {
    const rowCount = await loadRowCount($$props);
    allRowCount = rowCount;
  };

  async function loadNextData() {
    if (isLoading) return;
    loadNextDataRef.set(false);
    isLoading = true;

    const loadStart = new Date().getTime();
    // await new Promise(resolve => setTimeout(resolve, 5000));

    loadedTimeRef.set(loadStart);

    const nextRows = await loadDataPage(
      $$props,
      loadedRows.length,
      getIntSettingsValue('dataGrid.pageSize', 100, 5, 1000)
    );
    if (loadedTimeRef.get() !== loadStart) {
      // new load was dispatched
      return;
    }

    isLoading = false;

    if (nextRows.errorMessage) {
      errorMessage = nextRows.errorMessage;
    } else {
      if (allRowCount == null && !isRawMode) handleLoadRowCount();

      loadedRows = [...loadedRows, ...(preprocessLoadedRow ? nextRows.map(preprocessLoadedRow) : nextRows)];
      isLoadedAll = nextRows.length === 0;
      //   const loadedInfo = {
      //     loadedRows: [...loadedRows, ...nextRows],
      //     loadedTime,
      //   };
      //   setLoadProps(oldLoadProps => ({
      //     ...oldLoadProps,
      //     isLoading: false,
      //     isLoadedAll: oldLoadProps.loadNextDataToken == loadNextDataToken && nextRows.length === 0,
      //     loadNextDataToken,
      //     ...loadedInfo,
      //   }));
    }

    if (loadNextDataRef.get()) {
      loadNextData();
    }
    // console.log('LOADED', nextRows, loadedRows);
  }

  // $: griderProps = { ...$$props, sourceRows: loadProps.loadedRows };
  // $: grider = griderFactory(griderProps);

  function handleLoadNextData() {
    if (!isLoadedAll && !errorMessage && (!grider.disableLoadNextPage || loadedRows.length == 0)) {
      if (dataPageAvailable($$props)) {
        // If not, callbacks to load missing metadata are dispatched
        loadNextData();
      }
    }
  }

  function reload() {
    allRowCount = null;
    isLoading = false;
    loadedRows = [];
    isLoadedAll = false;
    loadedTime = new Date().getTime();
    errorMessage = null;
    loadNextDataRef.set(false);
    // loadNextDataToken = 0;
  }

  $: if (display?.cache?.refreshTime > loadedTime) {
    reload();
  }

  $: {
    if (masterLoadedTime && masterLoadedTime > loadedTime && display) {
      display.reload();
    }
  }

  $: if (setLoadedRows) setLoadedRows(loadedRows);
</script>

<DataGridCore
  {...$$props}
  bind:this={domGrid}
  onLoadNextData={handleLoadNextData}
  {errorMessage}
  {isLoading}
  allRowCount={rowCountLoaded || allRowCount}
  {isLoadedAll}
  {loadedTime}
  {grider}
  {display}
/>
