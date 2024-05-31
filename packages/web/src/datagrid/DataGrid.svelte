<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('DataGrid');

  registerCommand({
    id: 'dataGrid.switchToForm',
    category: 'Data grid',
    name: 'Switch to form',
    icon: 'icon form',
    keyText: 'F4',
    testEnabled: () => getCurrentEditor()?.switchViewEnabled('form'),
    onClick: () => getCurrentEditor().switchToView('form'),
  });

  registerCommand({
    id: 'dataGrid.switchToJson',
    category: 'Data grid',
    name: 'Switch to JSON',
    icon: 'icon json',
    keyText: 'F4',
    testEnabled: () => getCurrentEditor()?.switchViewEnabled('json'),
    onClick: () => getCurrentEditor().switchToView('json'),
  });

  registerCommand({
    id: 'dataGrid.switchToTable',
    category: 'Data grid',
    name: 'Switch to table',
    icon: 'icon table',
    keyText: 'F4',
    testEnabled: () => getCurrentEditor()?.switchViewEnabled('table'),
    onClick: () => getCurrentEditor().switchToView('table'),
  });

  registerCommand({
    id: 'dataGrid.toggleLeftPanel',
    category: 'Data grid',
    name: 'Toggle left panel',
    keyText: 'CtrlOrCommand+L',
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
  import MacroDetail from '../macro/MacroDetail.svelte';
  import MacroManager from '../macro/MacroManager.svelte';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import ColumnManager from './ColumnManager.svelte';
  import ReferenceManager from './ReferenceManager.svelte';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import _ from 'lodash';
  import registerCommand from '../commands/registerCommand';
  import { registerMenu } from '../utility/contextMenu';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';

  export let config;
  export let setConfig;
  export let gridCoreComponent;
  export let formViewComponent = null;
  export let jsonViewComponent = null;
  // export let formDisplay;
  export let display;
  export let changeSetState;
  export let dispatchChangeSet;
  export let useEvalFilters = false;

  export let isDetailView = false;
  export let showReferences = false;
  export let showMacros = false;
  export let expandMacros = false;
  export let isDynamicStructure = false;
  export let macroCondition;
  export let onRunMacro;
  export let hasMultiColumnFilter = false;
  export let setLoadedRows = null;

  let loadedRows;

  export const activator = createActivator('DataGrid', false);

  let selectedCellsPublished = () => [];
  let domColumnManager;

  const selectedMacro = writable(null);
  setContext('selectedMacro', selectedMacro);
  const macroValues = writable({});
  setContext('macroValues', macroValues);

  let managerSize;
  const collapsedLeftColumnStore =
    getContext('collapsedLeftColumnStore') || writable(getLocalStorage('dataGrid_collapsedLeftColumn', false));

  $: isFormView = !!config?.isFormView;
  $: isJsonView = !!config?.isJsonView;

  const handleExecuteMacro = () => {
    onRunMacro($selectedMacro, extractMacroValuesForMacro($macroValues, $selectedMacro), selectedCellsPublished());
    $selectedMacro = null;
  };

  export function switchViewEnabled(view) {
    if (view == 'form') return !!formViewComponent && !isFormView;
    if (view == 'table') return !!(isFormView || isJsonView);
    if (view == 'json') return !!jsonViewComponent && !isJsonView;
  }

  export function switchToView(view) {
    if (view == 'form') {
      display.switchToFormView(selectedCellsPublished()[0]?.row);
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

  $: if (managerSize) setLocalStorage('dataGridManagerWidth', managerSize);

  function getInitialManagerSize() {
    const width = getLocalStorage('dataGridManagerWidth');
    if (_.isNumber(width) && width > 30 && width < 500) {
      return `${width}px`;
    }
    return '300px';
  }
</script>

<HorizontalSplitter
  initialValue={getInitialManagerSize()}
  bind:size={managerSize}
  hideFirst={$collapsedLeftColumnStore}
>
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Columns" name="columns" height="45%" skip={isFormView}>
        <ColumnManager {...$$props} {managerSize} {isJsonView} {isDynamicStructure} bind:this={domColumnManager} />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem
        title="Filters"
        name="filters"
        height={showReferences && display?.hasReferences && !isFormView ? '15%' : '30%'}
        skip={!display?.filterable}
        collapsed={isDetailView}
      >
        <FormViewFilters
          {...$$props}
          {managerSize}
          {isDynamicStructure}
          {useEvalFilters}
          {isFormView}
          {hasMultiColumnFilter}
          driver={display?.driver}
        />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem
        title="References"
        name="references"
        height="30%"
        collapsed={isDetailView}
        skip={!(showReferences && display?.hasReferences)}
      >
        <ReferenceManager {...$$props} {managerSize} />
      </WidgetColumnBarItem>

      <WidgetColumnBarItem title="Macros" name="macros" skip={!showMacros} collapsed={!expandMacros}>
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
          <svelte:component this={jsonViewComponent} {...$$props} {setLoadedRows} />
        {:else}
          <svelte:component
            this={gridCoreComponent}
            {...$$props}
            {collapsedLeftColumnStore}
            formViewAvailable={!!formViewComponent}
            macroValues={extractMacroValuesForMacro($macroValues, $selectedMacro)}
            macroPreview={$selectedMacro}
            {setLoadedRows}
            bind:selectedCellsPublished
            onChangeSelectedColumns={cols => {
              if (domColumnManager) domColumnManager.setSelectedColumns(cols);
            }}
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
