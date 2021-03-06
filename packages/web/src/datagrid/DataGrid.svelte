<script lang="ts">
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';

  export let config;
  export let gridCoreComponent;
  export let showReferences = true;
</script>

<HorizontalSplitter initialValue="300px">
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Columns" name="columns" height={showReferences ? '40%' : '60%'} />
    </WidgetColumnBar>
  </div>
  <div slot="2">
    <svelte:component this={gridCoreComponent} {...$$props} />
  </div>
</HorizontalSplitter>

<style>
  .left {
    display: flex;
    flex: 1;
    background-color: var(--theme-bg-0);
  }
</style>
