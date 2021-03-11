<script lang="ts">
  import getElectron from '../../utility/getElectron';

  const electron = getElectron();
  export let row;
</script>

<a
  href="#"
  on:click={() => {
    const file = electron.remote.dialog.showSaveDialogSync(electron.remote.getCurrentWindow(), {});
    if (file) {
      const fs = window.require('fs');
      fs.copyFile(row.path, file, () => {});
    }
  }}
>
  save
</a>
