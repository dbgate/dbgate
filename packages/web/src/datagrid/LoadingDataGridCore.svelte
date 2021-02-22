<script lang="ts">
  import DataGridCore from './DataGridCore.svelte';

  export let loadDataPage;
  export let dataPageAvailable;
  export let loadRowCount;
  export let griderFactory;

  let loadProps = {
    isLoading: false,
    loadedRows: [],
    isLoadedAll: false,
    loadedTime: new Date().getTime(),
    allRowCount: null,
    errorMessage: null,
    loadNextDataToken: 0,
  };

  async function loadNextData() {
    if (loadProps.isLoading) return;
    loadProps.isLoading = true;

    const loadStart = new Date().getTime();

    // loadedTimeRef.current = loadStart;

    const nextRows = await loadDataPage($$props, loadProps.loadedRows.length, 100);
    // if (loadedTimeRef.current !== loadStart) {
    //   // new load was dispatched
    //   return;
    // }

    loadProps.isLoading = false;

    if (nextRows.errorMessage) {
      loadProps.errorMessage = nextRows.errorMessage;
    } else {
      // if (allRowCount == null) handleLoadRowCount();
      loadProps.loadedRows = [...loadProps.loadedRows, ...nextRows];
      loadProps.isLoadedAll = nextRows.length === 0;
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

  $: griderProps = { ...$$props, sourceRows: loadProps.loadedRows };
  $: grider = griderFactory(griderProps);

  const handleLoadNextData = () => {
    if (!loadProps.isLoadedAll && !loadProps.errorMessage && !grider.disableLoadNextPage) {
      if (dataPageAvailable($$props)) {
        // If not, callbacks to load missing metadata are dispatched
        loadNextData();
      }
    }
  };
</script>

<DataGridCore />
