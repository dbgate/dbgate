<script lang="ts" context="module">
  import Chart from 'chart.js/auto';
  import 'chartjs-adapter-moment';
</script>

<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from 'svelte';

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
      options: {
        ...options,
        plugins,
      },
    });
  });

  afterUpdate(() => {
    if (!chart) return;
    chart.data = data;
    chart.type = type;
    chart.options = {
      ...options,
      plugins,
    };
    // chart.plugins = plugins;
    chart.update();
  });

  onDestroy(() => {
    chart = null;
  });
</script>

<canvas bind:this={domChart} {...$$restProps} use:contextMenu={menu} />
