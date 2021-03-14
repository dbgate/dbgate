<script lang="ts" context="module">
  function extractMacroValuesForMacro(macroValues, macro) {
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

  let managerSize;
  let selectedMacro;
</script>

<HorizontalSplitter initialValue="300px" bind:size={managerSize}>
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Columns" name="columns" height="40%">
        <FreeTableColumnEditor {...$$props} {managerSize} />
      </WidgetColumnBarItem>

      <!-- <WidgetColumnBarItem title="Macros" name="macros">
        <MacroManager {...$$props} {managerSize} />
      </WidgetColumnBarItem> -->
    </WidgetColumnBar>
  </div>
  <div class="grid" slot="2">
    <VerticalSplitter initialValue="70%">
      <svelte:fragment slot="1">
        <FreeTableGridCore {...$$props} />
      </svelte:fragment>

      <!-- macroPreview={selectedMacro}
      macroValues={extractMacroValuesForMacro(macroValues, selectedMacro)}
      onSelectionChanged={setSelectedCells}
      {setSelectedMacro} -->

      <!-- {#if selectedMacro}
        <MacroDetail
          {selectedMacro}
          {setSelectedMacro}
          onChangeValues={setMacroValues}
          {macroValues}
          onExecute={handleExecuteMacro}
        />
      {/if} -->
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
