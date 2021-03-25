<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { runMacroOnChangeSet } from 'dbgate-datalib';

  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import FormViewFilters from '../formview/FormViewFilters.svelte';
  import { extractMacroValuesForMacro } from '../freetable/FreeTableGrid.svelte';
  import MacroDetail from '../freetable/MacroDetail.svelte';
  import MacroManager from '../freetable/MacroManager.svelte';
  import createRef from '../utility/createRef';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import ColumnManager from './ColumnManager.svelte';
  import ReferenceManager from './ReferenceManager.svelte';

  export let config;
  export let gridCoreComponent;
  export let formViewComponent;
  export let formDisplay;
  export let display;
  export let changeSetState;
  export let dispatchChangeSet;

  export let isDetailView = false;
  export let showReferences = false;
  export let showMacros;

  let selectedCellsPublished = [];

  const selectedMacro = writable(null);
  setContext('selectedMacro', selectedMacro);
  const macroValues = writable({});
  setContext('macroValues', macroValues);

  let managerSize;

  $: isFormView = !!(formDisplay && formDisplay.config && formDisplay.config.isFormView);

  const handleExecuteMacro = () => {
    const newChangeSet = runMacroOnChangeSet(
      $selectedMacro,
      extractMacroValuesForMacro($macroValues, $selectedMacro),
      selectedCellsPublished,
      changeSetState?.value,
      display
    );
    if (newChangeSet) {
      dispatchChangeSet({ type: 'set', value: newChangeSet });
    }
    $selectedMacro = null;
  };
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

      <WidgetColumnBarItem title="Macros" name="macros" skip={!showMacros} collapsed={isDetailView}>
        <MacroManager {...$$props} {managerSize} macroCondition={macro => macro.type == 'transformValue'} />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  </div>
  <svelte:fragment slot="2">
    <VerticalSplitter initialValue="70%" isSplitter={!!$selectedMacro && !isFormView && showMacros}>
      <svelte:fragment slot="1">
        {#if isFormView}
          <svelte:component this={formViewComponent} {...$$props} />
        {:else}
          <svelte:component
            this={gridCoreComponent}
            {...$$props}
            formViewAvailable={!!formViewComponent && !!formDisplay}
            onSelectionChanged={value => (selectedCellsPublished = value)}
            macroValues={extractMacroValuesForMacro($macroValues, $selectedMacro)}
            macroPreview={$selectedMacro}
            {selectedCellsPublished}
          />
        {/if}
      </svelte:fragment>

      <svelte:fragment slot="2">
        {#if $selectedMacro}
          <MacroDetail onExecute={handleExecuteMacro} />
        {/if}
      </svelte:fragment>
    </VerticalSplitter>
  </svelte:fragment>
</HorizontalSplitter>

<style>
  .left {
    display: flex;
    flex: 1;
    background-color: var(--theme-bg-0);
  }
</style>
