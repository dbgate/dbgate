<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import Chart from 'chart.js';
  import contextMenu from '../utility/contextMenu';

  export let data;
  export let type = 'line';
  export let options = {};
  export let plugins = {};
  export let menu;

  let chart = null;
  let domChart;

  onMount(() => {
    chart = new Chart(domChart, {
      type,
      data,
      options,
      plugins,
    });
  });
  afterUpdate(() => {
    if (!chart) return;
    chart.data = data;
    chart.type = type;
    chart.options = options;
    chart.plugins = plugins;
    chart.update();
  });
  onDestroy(() => {
    chart = null;
  });
</script>

<canvas bind:this={domChart} {...$$restProps} use:contextMenu={menu} />
