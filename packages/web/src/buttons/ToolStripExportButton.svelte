<script lang="ts" context="module">
  import { getContext, setContext } from 'svelte';
  import { createQuickExportMenuItems } from '../utility/createQuickExportMenu';

  import createRef from '../utility/createRef';

  export function createQuickExportHandlerRef() {
    const quickExportHandlerRef = createRef(null);
    setContext('quickExportHandlerRef', quickExportHandlerRef);
    return quickExportHandlerRef;
  }

  export function registerQuickExportHandler(handler) {
    const quickExportHandlerRef: any = getContext('quickExportHandlerRef');
    if (quickExportHandlerRef) {
      quickExportHandlerRef.set(handler);
    }
  }
</script>

<script lang="ts">
  import getElectron from '../utility/getElectron';
  import hasPermission from '../utility/hasPermission';
  import ToolStripCommandButton from './ToolStripCommandButton.svelte';
  import ToolStripDropDownButton from './ToolStripDropDownButton.svelte';
  import _ from 'lodash';
  export let quickExportHandlerRef = null;
  export let command = 'sqlDataGrid.export';
  export let label = 'Export';

  function getExportMenu() {
    return [
      quickExportHandlerRef?.value
        ? createQuickExportMenuItems(quickExportHandlerRef?.value, { command })
        : { command },
    ];
  }
</script>

{#if hasPermission('dbops/export')}
  {#if quickExportHandlerRef}
    <ToolStripDropDownButton menu={getExportMenu} label={_.isFunction(label) ? label() : label} icon="icon export" />
  {:else}
    <ToolStripCommandButton {command} />
  {/if}
{/if}
