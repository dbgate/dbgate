<script lang="ts" context="module">
  export function extractMacroValuesForMacro(macroValues, macro) {
    // return {};
    if (!macro) return {};
    return {
      ..._.fromPairs((macro.args || []).filter(x => x.default != null).map(x => [x.name, x.default])),
      ..._.mapKeys(macroValues, (v, k) => k.replace(/^.*#/, '')),
    };
  }
</script>

<script lang="ts">
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import ColumnManager from '../datagrid/ColumnManager.svelte';
  import ReferenceManager from '../datagrid/ReferenceManager.svelte';
  import FreeTableGridCore from './FreeTableGridCore.svelte';
  import FreeTableColumnEditor from './FreeTableColumnEditor.svelte';
  import MacroManager from './MacroManager.svelte';
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import MacroDetail from './MacroDetail.svelte';
  import { runMacro } from 'dbgate-datalib';
  import _ from 'lodash';

  export let modelState;
  export let dispatchModel;

  let managerSize;
  let selectedCellsPublished = [];

  const selectedMacro = writable(null);
  setContext('selectedMacro', selectedMacro);
  const macroValues = writable({});
  setContext('macroValues', macroValues);

  const handleExecuteMacro = () => {
    const newModel = runMacro(
      $selectedMacro,
      extractMacroValuesForMacro($macroValues, $selectedMacro),
      modelState.value,
      false,
      selectedCellsPublished
    );
    dispatchModel({ type: 'set', value: newModel });
    $selectedMacro = null;
  };
</script>

<HorizontalSplitter initialValue="300px" bind:size={managerSize}>
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Columns" name="columns" height="40%">
        <FreeTableColumnEditor {...$$props} {managerSize} />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem title="Macros" name="macros">
        <MacroManager {...$$props} {managerSize} />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  </div>
  <div class="grid" slot="2">
    <VerticalSplitter initialValue="70%" isSplitter={!!$selectedMacro}>
      <svelte:fragment slot="1">
        <FreeTableGridCore
          {...$$props}
          onSelectionChanged={value => (selectedCellsPublished = value)}
          macroValues={extractMacroValuesForMacro($macroValues, $selectedMacro)}
          {selectedCellsPublished}
          macroPreview={$selectedMacro}
        />
      </svelte:fragment>

      <!-- macroPreview={selectedMacro}
      macroValues={extractMacroValuesForMacro(macroValues, selectedMacro)}
      onSelectionChanged={setSelectedCells}
      {setSelectedMacro} -->

      <svelte:fragment slot="2">
        {#if $selectedMacro}
          <MacroDetail onExecute={handleExecuteMacro} />
        {/if}
      </svelte:fragment>
    </VerticalSplitter>
  </div>
</HorizontalSplitter>

<style>
  .left {
    display: flex;
    flex: 1;
    background-color: var(--theme-bg-0);
  }

  .grid {
    position: relative;
    flex-grow: 1;
  }
</style>
