<script lang="ts">
  import _ from 'lodash';

  import ToolStripCommandButton from './ToolStripCommandButton.svelte';
  import ToolStripSplitDropDownButton from './ToolStripSplitDropDownButton.svelte';

  export let commands;
  export let hideDisabled = false;
  export let buttonLabel = null;

  $: menu = _.compact(commands).map(command => (_.isString(command) ? { command } : command));
</script>

<ToolStripCommandButton
  command={commands[0]}
  component={ToolStripSplitDropDownButton}
  {menu}
  {hideDisabled}
  {buttonLabel}
  {...$$restProps}
/>
