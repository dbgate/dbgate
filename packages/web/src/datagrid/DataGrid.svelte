<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('DataGrid');

  registerCommand({
    id: 'dataGrid.switchToForm',
    category: 'Data grid',
    name: 'Switch to form',
    keyText: 'F4',
    testEnabled: () => getCurrentEditor()?.switchViewEnabled('form'),
    onClick: () => getCurrentEditor().switchToView('form'),
  });

  registerCommand({
    id: 'dataGrid.switchToJson',
    category: 'Data grid',
    name: 'Switch to JSON',
    keyText: 'F4',
    testEnabled: () => getCurrentEditor()?.switchViewEnabled('json'),
    onClick: () => getCurrentEditor().switchToView('json'),
  });

  registerCommand({
    id: 'dataGrid.switchToTable',
    category: 'Data grid',
    name: 'Switch to table',
    keyText: 'F4',
    testEnabled: () => getCurrentEditor()?.switchViewEnabled('table'),
    onClick: () => getCurrentEditor().switchToView('table'),
  });

  registerCommand({
    id: 'dataGrid.toggleLeftPanel',
    category: 'Data grid',
    name: 'Toggle left panel',
    keyText: 'Ctrl+L',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().toggleLeftPanel(),
  });

  function extractMacroValuesForMacro(macroValues, macro) {
    // return {};
    if (!macro) return {};
    return {
      ..._.fromPairs((macro.args || []).filter(x => x.default != null).map(x => [x.name, x.default])),
      ..._.mapKeys(macroValues, (v, k) => k.replace(/^.*#/, '')),
    };
  }
</script>

<script lang="ts">
  import { getContext, setContext } from 'svelte';
  import { writable } from 'svelte/store';

  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import FormViewFilters from '../formview/FormViewFilters.svelte';
  import MacroDetail from '../freetable/MacroDetail.svelte';
  import MacroManager from '../freetable/MacroManager.svelte';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import ColumnManager from './ColumnManager.svelte';
  import ReferenceManager from './ReferenceManager.svelte';
  import FreeTableColumnEditor from '../freetable/FreeTableColumnEditor.svelte';
  import JsonViewFilters from '../jsonview/JsonViewFilters.svelte';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import _ from 'lodash';
  import registerCommand from '../commands/registerCommand';
  import { registerMenu } from '../utility/contextMenu';
  import { getBoolSettingsValue } from '../settings/settingsTools';

  export let config;
  export let setConfig;
  export let gridCoreComponent;
  export let formViewComponent = null;
  export let jsonViewComponent = null;
  export let formDisplay;
  export let display;
  export let changeSetState;
  export let dispatchChangeSet;

  export let isDetailView = false;
  export let showReferences = false;
  export let showMacros;
  export let freeTableColumn = false;
  export let isDynamicStructure = false;
  export let macroCondition;
  export let onRunMacro;

  export let loadedRows;

  export const activator = createActivator('DataGrid', false);

  let selectedCellsPublished = () => [];

  const selectedMacro = writable(null);
  setContext('selectedMacro', selectedMacro);
  const macroValues = writable({});
  setContext('macroValues', macroValues);

  let managerSize;
  const collapsedLeftColumnStore =
    getContext('collapsedLeftColumnStore') || writable(!getBoolSettingsValue('dataGrid.showLeftColumn', false));

  $: isFormView = !!(formDisplay && formDisplay.config && formDisplay.config.isFormView);
  $: isJsonView = !!config?.isJsonView;

  const handleExecuteMacro = () => {
    onRunMacro($selectedMacro, extractMacroValuesForMacro($macroValues, $selectedMacro), selectedCellsPublished());
    $selectedMacro = null;
  };

  export function switchViewEnabled(view) {
    if (view == 'form') return !!formViewComponent && !!formDisplay && !isFormView && display?.baseTable?.primaryKey;
    if (view == 'table') return !!(isFormView || isJsonView);
    if (view == 'json') return !!jsonViewComponent && !isJsonView;
  }

  export function switchToView(view) {
    if (view == 'form') {
      display.switchToFormView(selectedCellsPublished()[0]?.rowData);
    }
    if (view == 'table') {
      setConfig(cfg => ({
        ...cfg,
        isFormView: false,
        isJsonView: false,
        formViewKey: null,
      }));
    }
    if (view == 'json') {
      display.switchToJsonView();
    }
  }

  export function toggleLeftPanel() {
    collapsedLeftColumnStore.update(x => !x);
  }

  registerMenu(
    { command: 'dataGrid.switchToForm', tag: 'switch', hideDisabled: true },
    { command: 'dataGrid.switchToTable', tag: 'switch', hideDisabled: true },
    { command: 'dataGrid.switchToJson', tag: 'switch', hideDisabled: true },
    { command: 'dataGrid.toggleLeftPanel', tag: 'switch' }
  );
</script>

<HorizontalSplitter initialValue="300px" bind:size={managerSize} hideFirst={$collapsedLeftColumnStore}>
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Columns" name="columns" height="45%" skip={freeTableColumn || isFormView}>
        <ColumnManager {...$$props} {managerSize} {isJsonView} />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem title="Filters" name="jsonFilters" height="30%" skip={!isDynamicStructure}>
        <JsonViewFilters {...$$props} {managerSize} />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem title="Columns" name="freeColumns" height="40%" skip={!freeTableColumn}>
        <FreeTableColumnEditor {...$$props} {managerSize} />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem title="Filters" name="filters" height="30%" skip={!isFormView}>
        <FormViewFilters {...$$props} {managerSize} driver={formDisplay?.driver} />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem
        title="References"
        name="references"
        height="30%"
        collapsed={isDetailView}
        skip={!showReferences || !display?.hasReferences}
      >
        <ReferenceManager {...$$props} {managerSize} />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem title="Macros" name="macros" skip={!showMacros} collapsed>
        <MacroManager {...$$props} {managerSize} />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  </div>
  <svelte:fragment slot="2">
    <VerticalSplitter initialValue="70%" isSplitter={!!$selectedMacro && !isFormView && showMacros}>
      <svelte:fragment slot="1">
        {#if isFormView}
          <svelte:component this={formViewComponent} {...$$props} />
        {:else if isJsonView}
          <svelte:component this={jsonViewComponent} {...$$props} bind:loadedRows />
        {:else}
          <svelte:component
            this={gridCoreComponent}
            {...$$props}
            {collapsedLeftColumnStore}
            formViewAvailable={!!formViewComponent && !!formDisplay}
            macroValues={extractMacroValuesForMacro($macroValues, $selectedMacro)}
            macroPreview={$selectedMacro}
            bind:loadedRows
            bind:selectedCellsPublished
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
