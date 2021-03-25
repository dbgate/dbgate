<script lang="ts">
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import FormViewFilters from '../formview/FormViewFilters.svelte';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import ColumnManager from './ColumnManager.svelte';
  import ReferenceManager from './ReferenceManager.svelte';

  export let config;
  export let gridCoreComponent;
  export let formViewComponent;
  export let formDisplay;
  export let display;

  export let isDetailView = false;
  export let showReferences = false;

  let managerSize;

  $: isFormView = !!(formDisplay && formDisplay.config && formDisplay.config.isFormView);
</script>

<HorizontalSplitter initialValue="300px" bind:size={managerSize}>
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Columns" name="columns" height={showReferences ? '40%' : '60%'} skip={isFormView}>
        <ColumnManager {...$$props} {managerSize} />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem title="Filters" name="filters" height="30%" skip={!isFormView}>
        <FormViewFilters {...$$props} {managerSize} />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem
        title="References"
        name="references"
        height="30%"
        collapsed={isDetailView}
        skip={!showReferences || !display.hasReferences}
      >
        <ReferenceManager {...$$props} {managerSize} />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  </div>
  <svelte:fragment slot="2">
    {#if isFormView}
      <svelte:component this={formViewComponent} {...$$props} />
    {:else}
      <svelte:component
        this={gridCoreComponent}
        {...$$props}
        formViewAvailable={!!formViewComponent && !!formDisplay}
      />
    {/if}
  </svelte:fragment>
</HorizontalSplitter>

<style>
  .left {
    display: flex;
    flex: 1;
    background-color: var(--theme-bg-0);
  }
</style>
