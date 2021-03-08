<script context="module" lang="ts">
  async function loadDataPage(props, offset, limit) {
    const { jslid, display } = props;

    const response = await axios.post('jsldata/get-rows', {
      jslid,
      offset,
      limit,
      filters: display ? display.compileFilters() : null,
    });

    return response.data;
  }

  function dataPageAvailable(props) {
    return true;
  }

  async function loadRowCount(props) {
    const { jslid } = props;

    const response = await axios.request({
      url: 'jsldata/get-stats',
      method: 'get',
      params: {
        jslid,
      },
    });
    return response.data.rowCount;
  }
</script>

<script lang="ts">
  import _ from 'lodash';

  import axios from '../utility/axios';
  import socket from '../utility/socket';
  import useEffect from '../utility/useEffect';

  import LoadingDataGridCore from './LoadingDataGridCore.svelte';
  import RowsArrayGrider from './RowsArrayGrider';

  export let jslid;

  let loadedRows = [];
  let domGrid;

  let changeIndex = 0;
  let rowCountLoaded = null;

  const throttleLoadNext = _.throttle(() => domGrid.loadNextData(), 500);

  const handleJslDataStats = stats => {
    if (stats.changeIndex < changeIndex) return;
    changeIndex = stats.changeIndex;
    rowCountLoaded = stats.rowCount;
    throttleLoadNext();
  };

  $: effect = useEffect(() => onJslId(jslid));
  function onJslId(jslidVal) {
    if (jslidVal) {
      socket.on(`jsldata-stats-${jslidVal}`, handleJslDataStats);
      return () => {
        socket.off(`jsldata-stats-${jslidVal}`, handleJslDataStats);
      };
    }
  }
  $: $effect;

  $: grider = new RowsArrayGrider(loadedRows);
</script>

<LoadingDataGridCore
  bind:this={domGrid}
  {...$$props}
  bind:loadedRows
  {loadDataPage}
  {dataPageAvailable}
  {loadRowCount}
  {grider}
  {rowCountLoaded}
/>
