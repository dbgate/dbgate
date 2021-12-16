<script>
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import TableControl from '../elements/TableControl.svelte';

  import axiosInstance from '../utility/axiosInstance';
  import formatFileSize from '../utility/formatFileSize';
  import getElectron from '../utility/getElectron';
  import resolveApi from '../utility/resolveApi';
  import socket from '../utility/socket';
  import useEffect from '../utility/useEffect';

  export let runnerId;
  export let executeNumber;

  const electron = getElectron();

  let files = [];

  $: if (executeNumber >= 0) files = [];

  $: effect = useEffect(() => registerRunnerDone(runnerId));

  function registerRunnerDone(rid) {
    if (rid) {
      socket().on(`runner-done-${rid}`, handleRunnerDone);
      return () => {
        socket().off(`runner-done-${rid}`, handleRunnerDone);
      };
    } else {
      return () => {};
    }
  }

  $: $effect;

  const handleRunnerDone = async () => {
    const resp = await axiosInstance().get(`runners/files?runid=${runnerId}`);
    files = resp.data;
  };
</script>

{#if !files || files.length == 0}
  <ErrorInfo message="No output files" icon="img alert" />
{:else}
  <TableControl
    rows={files}
    columns={[
      { fieldName: 'name', header: 'Name' },
      { fieldName: 'size', header: 'Size', formatter: row => formatFileSize(row.size) },
      !electron && {
        fieldName: 'download',
        header: 'Download',
        slot: 0,
      },
      electron && {
        fieldName: 'copy',
        header: 'Copy',
        slot: 1,
      },
      electron && {
        fieldName: 'show',
        header: 'Show',
        slot: 2,
      },
    ]}
  >
    <a
      slot="0"
      let:row
      href={`${resolveApi()}/runners/data/${runnerId}/${row.name}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      download
    </a>

    <a
      slot="1"
      let:row
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

    <a
      slot="2"
      let:row
      href="#"
      on:click={() => {
        electron.remote.shell.showItemInFolder(row.path);
      }}
    >
      show
    </a>
  </TableControl>
{/if}
