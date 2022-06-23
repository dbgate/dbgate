<script context="module">
  function getCommandTitle(command) {
    let res = command.text;
    if (command.keyText || command.keyTextFromGroup) {
      res += ` (${formatKeyText(command.keyText || command.keyTextFromGroup)})`;
    }
    return res;
  }
</script>

<script lang="ts">
  import { commandsCustomized } from '../stores';
  import { formatKeyText } from '../utility/common';
  import FormStyledButton from './FormStyledButton.svelte';

  export let command;
  export let component = FormStyledButton;
  export let hideDisabled = false;

  $: cmd = Object.values($commandsCustomized).find((x: any) => x.id == command) as any;
</script>

{#if cmd && (!hideDisabled || cmd.enabled)}
  <svelte:component
    this={component}
    title={getCommandTitle(cmd)}
    icon={cmd.icon}
    on:click={cmd.onClick}
    disabled={!cmd.enabled}
    value={cmd.toolbarName || cmd.name}
    {...$$restProps}
  />
{/if}
