<script lang="ts">
  import DataGridCore from './DataGridCore.svelte';

  export let loadDataPage;
  export let dataPageAvailable;
  export let loadRowCount;
  export let grider;
  // export let griderFactory;

  export let loadedRows = [];
  let isLoading = false;
  let isLoadedAll = false;
  let loadedTime = new Date().getTime();
  let allRowCount = null;
  let errorMessage = null;
  let loadNextDataToken = 0;

  async function loadNextData() {
    if (isLoading) return;
    isLoading = true;

    const loadStart = new Date().getTime();

    // loadedTimeRef.current = loadStart;

    const nextRows = await loadDataPage($$props, loadedRows.length, 100);
    // if (loadedTimeRef.current !== loadStart) {
    //   // new load was dispatched
    //   return;
    // }

    isLoading = false;

    if (nextRows.errorMessage) {
      errorMessage = nextRows.errorMessage;
    } else {
      // if (allRowCount == null) handleLoadRowCount();
      loadedRows = [loadedRows, ...nextRows];
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
  }

  // $: griderProps = { ...$$props, sourceRows: loadProps.loadedRows };
  // $: grider = griderFactory(griderProps);

  const handleLoadNextData = () => {
    if (!isLoadedAll && !errorMessage && !grider.disableLoadNextPage) {
      if (dataPageAvailable($$props)) {
        // If not, callbacks to load missing metadata are dispatched
        loadNextData();
      }
    }
  };
</script>

<DataGridCore {...$$props} loadNextData={handleLoadNextData} {grider} />
