<script lang="ts">
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import ColumnManager from './ColumnManager.svelte';
  import ReferenceManager from './ReferenceManager.svelte';

  export let config;
  export let gridCoreComponent;

  export let isDetailView = false;
  export let showReferences = true;

  let managerSize;
</script>

<HorizontalSplitter initialValue="300px" bind:size={managerSize}>
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Columns" name="columns" height={showReferences ? '40%' : '60%'}>
        <ColumnManager {...$$props} {managerSize} />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem title="References" name="references" height="30%" collapsed={isDetailView}>
        <ReferenceManager {...$$props} {managerSize} />
      </WidgetColumnBarItem>
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
