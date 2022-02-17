<script lang="ts">
  import _ from 'lodash';

  import ToolStripCommandButton from './ToolStripCommandButton.svelte';
  import ToolStripSplitDropDownButton from './ToolStripSplitDropDownButton.svelte';

  export let commands;
  $: menu = _.compact(commands).map(command => ({ command }));
</script>

<ToolStripCommandButton command={commands[0]} component={ToolStripSplitDropDownButton} {menu} />
