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
  let allRowCountError = null;
  let errorMessage = null;
  let domGrid;

  let isFetchingAll = false;
  let fetchAllLoadedCount = 0;

  const loadNextDataRef = createRef(false);
  const loadedTimeRef = createRef(null);

  export function resetLoadedAll() {
    isLoadedAll = false;
    domGrid.loadNextDataIfNeeded();
  }

  const handleLoadRowCount = async () => {
    const result = await loadRowCount($$props);
    if (result != null && typeof result === 'object' && result.errorMessage) {
      allRowCount = null;
      allRowCountError = result.errorMessage;
    } else {
      allRowCount = result;
      allRowCountError = null;
    }
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
      getIntSettingsValue('dataGrid.pageSize', 100, 5, 50000)
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

  async function fetchAllRows() {
    if (isFetchingAll || isLoadedAll) return;
    isFetchingAll = true;
    fetchAllLoadedCount = loadedRows.length;
    errorMessage = null;

    const pageSize = getIntSettingsValue('dataGrid.pageSize', 100, 5, 50000);
    const fetchStart = new Date().getTime();
    loadedTimeRef.set(fetchStart);

    // Accumulate into a local buffer to avoid O(n²) full-array copies each iteration.
    const buffer = [...loadedRows];

    try {
      while (!isLoadedAll) {
        const nextRows = await loadDataPage($$props, buffer.length, pageSize);

        if (loadedTimeRef.get() !== fetchStart) {
          // a reload was triggered; abort without overwriting loadedRows with stale data
          return;
        }

        if (nextRows.errorMessage) {
          errorMessage = nextRows.errorMessage;
          break;
        }

        if (nextRows.length === 0) {
          isLoadedAll = true;
          break;
        }

        const processed = preprocessLoadedRow ? nextRows.map(preprocessLoadedRow) : nextRows;
        buffer.push(...processed);
        fetchAllLoadedCount = buffer.length;
      }

      // Single assignment triggers Svelte reactivity once for all accumulated rows.
      loadedRows = buffer;
      if (allRowCount == null && !isRawMode) handleLoadRowCount();
    } finally {
      isFetchingAll = false;
    }
  }

  // $: griderProps = { ...$$props, sourceRows: loadProps.loadedRows };
  // $: grider = griderFactory(griderProps);

  function handleLoadNextData() {
    if (!isLoadedAll && !errorMessage && !isFetchingAll && (!grider.disableLoadNextPage || loadedRows.length == 0)) {
      if (dataPageAvailable($$props)) {
        // If not, callbacks to load missing metadata are dispatched
        loadNextData();
      }
    }
  }

  function reload() {
    allRowCount = null;
    allRowCountError = null;
    isLoading = false;
    isFetchingAll = false;
    fetchAllLoadedCount = 0;
    loadedRows = [];
    isLoadedAll = false;
    loadedTime = new Date().getTime();
    errorMessage = null;
    loadNextDataRef.set(false);
    loadedTimeRef.set(null);
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
  onFetchAllRows={fetchAllRows}
  {errorMessage}
  {isLoading}
  {isFetchingAll}
  {fetchAllLoadedCount}
  allRowCount={rowCountLoaded || allRowCount}
  {allRowCountError}
  onReloadRowCount={handleLoadRowCount}
  {isLoadedAll}
  {loadedTime}
  {grider}
  {display}
/>
