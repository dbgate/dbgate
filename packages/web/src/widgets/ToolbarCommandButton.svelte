<script context="module">
  function getCommandTitle(command) {
    let res = command.text;
    if (command.keyText || command.keyTextFromGroup) res += ` (${command.keyText || command.keyTextFromGroup})`;
    return res;
  }
</script>

<script lang="ts">
  import { commandsCustomized } from '../stores';
  import RoundToolbarButton from './RoundToolbarButton.svelte';

  export let command;
  export let component = RoundToolbarButton;

  $: cmd = Object.values($commandsCustomized).find((x: any) => x.id == command) as any;
</script>

{#if cmd}
  <svelte:component
    this={component}
    title={getCommandTitle(cmd)}
    icon={cmd.icon}
    on:click={cmd.onClick}
    disabled={!cmd.enabled}
  >
    {cmd.toolbarName || cmd.name}
  </svelte:component>
{/if}
