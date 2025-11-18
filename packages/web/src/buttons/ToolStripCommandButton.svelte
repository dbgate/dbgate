<script context="module">
  function getCommandTitle(command) {
    let res = _tval(command.text);
    if (command.keyText || command.keyTextFromGroup) {
      res += ` (${formatKeyText(command.keyText || command.keyTextFromGroup)})`;
    }
    return res;
  }
</script>

<script lang="ts">
  import { commandsCustomized } from '../stores';
  import { formatKeyText } from '../utility/common';
  import ToolStripButton from './ToolStripButton.svelte';
  import _ from 'lodash';
  import { _tval } from '../translations';

  export let command;
  export let component = ToolStripButton;
  export let hideDisabled = false;
  export let buttonLabel = null;
  export let iconAfter = null;

  $: cmd = Object.values($commandsCustomized).find((x: any) => x.id == command) as any;
</script>

{#if cmd && (!hideDisabled || cmd.enabled)}
  <svelte:component
    this={component}
    title={getCommandTitle(cmd)}
    icon={cmd.icon}
    on:click={cmd.onClick}
    disabled={!cmd.enabled}
    {iconAfter}
    {...$$restProps}
  >
    {(_tval(buttonLabel) || _tval(cmd?.toolbarName) || _tval(cmd?.name))}
  </svelte:component>
{/if}
