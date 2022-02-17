<script lang="ts">
  import getElectron from '../utility/getElectron';

  import ToolStripCommandButton from './ToolStripCommandButton.svelte';
  import ToolStripSplitDropDownButton from './ToolStripSplitDropDownButton.svelte';

  export let idPrefix;

  const electron = getElectron();
</script>

<ToolStripCommandButton
  command={`${idPrefix}.save`}
  component={ToolStripSplitDropDownButton}
  menu={[
    { command: `${idPrefix}.save` },
    { command: `${idPrefix}.saveAs` },
    electron && { command: `${idPrefix}.saveToDisk` },
  ]}
/>
