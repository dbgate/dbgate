<script lang="ts" context="module">
  import { getContext, setContext } from 'svelte';
  import { extensions } from '../stores';
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
  import ToolStripCommandButton from './ToolStripCommandButton.svelte';
  import ToolStripDropDownButton from './ToolStripDropDownButton.svelte';

  const electron = getElectron();

  export let quickExportHandlerRef = null;
  export let command = 'sqlDataGrid.export';
  export let label = 'Advanced settings';

  function getExportMenu() {
    return [
      quickExportHandlerRef?.value ? createQuickExportMenuItems($extensions, quickExportHandlerRef?.value) : null,
      { divider: true },
      { command, text: label },
    ];
  }
</script>

{#if quickExportHandlerRef && electron}
  <ToolStripDropDownButton menu={getExportMenu} label="Export" icon="icon export" />
{:else}
  <ToolStripCommandButton {command} />
{/if}
