<script lang="ts">
  import getElectron from '../../utility/getElectron';

  const electron = getElectron();
  export let row;
</script>

<a
  href="#"
  on:click={() => {
    electron.remote.shell.showItemInFolder(row.path);
  }}
>
  show
</a>
