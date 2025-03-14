<script>
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import TableControl from '../elements/TableControl.svelte';
  import { apiOff, apiOn, apiCall } from '../utility/api';

  import formatFileSize from '../utility/formatFileSize';
  import getElectron from '../utility/getElectron';
  import { downloadFromApi } from '../utility/exportFileTools';
  import useEffect from '../utility/useEffect';
  import Link from '../elements/Link.svelte';

  export let runnerId;
  export let executeNumber;

  const electron = getElectron();

  let files = [];

  $: if (executeNumber >= 0) files = [];

  $: effect = useEffect(() => registerRunnerDone(runnerId));

  function registerRunnerDone(rid) {
    if (rid) {
      apiOn(`runner-done-${rid}`, handleRunnerDone);
      return () => {
        apiOff(`runner-done-${rid}`, handleRunnerDone);
      };
    } else {
      return () => {};
    }
  }

  $: $effect;

  const handleRunnerDone = async () => {
    const resp = await apiCall('runners/files', { runid: runnerId });
    files = resp;
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
    <svelte:fragment slot="0" let:row>
      <Link
        onClick={() => {
          downloadFromApi(`runners/data/${runnerId}/${row.name}`, row.name);
        }}
      >
        download
      </Link>
    </svelte:fragment>

    <svelte:fragment slot="1" let:row>
      <Link
        onClick={async () => {
          const file = await electron.showSaveDialog({});
          if (file) {
            const fs = window.require('fs');
            fs.copyFile(row.path, file, () => {});
          }
        }}
      >
        save
      </Link>
    </svelte:fragment>

    <svelte:fragment slot="2" let:row>
      <Link
        onClick={() => {
          electron.showItemInFolder(row.path);
        }}
      >
        show
      </Link>
    </svelte:fragment>
  </TableControl>
{/if}
