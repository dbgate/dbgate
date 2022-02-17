<script lang="ts">
  import getElectron from '../utility/getElectron';
  import ToolStripCommandSplitButton from './ToolStripCommandSplitButton.svelte';

  export let idPrefix;

  const electron = getElectron();
</script>

<ToolStripCommandSplitButton
  commands={[`${idPrefix}.save`, `${idPrefix}.saveAs`, electron && `${idPrefix}.saveToDisk`]}
/>
