<script lang="ts">
  import ErrorInfo from '../../elements/ErrorInfo.svelte';
  import TableControl from '../../elements/TableControl.svelte';

  import axiosInstance from '../../utility/axiosInstance';
  import formatFileSize from '../../utility/formatFileSize';
  import getElectron from '../../utility/getElectron';
  import socket from '../../utility/socket';
  import useEffect from '../../utility/useEffect';
  import CopyLink from './CopyLink.svelte';
  import DownloadLink from './DownloadLink.svelte';
  import ShowLink from './ShowLink.svelte';

  export let runnerId;
  export let executeNumber;

  let files = [];

  $: if (executeNumber >= 0) files = [];

  $: effect = useEffect(() => registerRunnerDone(runnerId));

  const electron = getElectron();

  function registerRunnerDone(rid) {
    if (rid) {
      socket.on(`runner-done-${rid}`, handleRunnerDone);
      return () => {
        socket.off(`runner-done-${rid}`, handleRunnerDone);
      };
    } else {
      return () => {};
    }
  }

  $: $effect;

  const handleRunnerDone = async () => {
    const resp = await axiosInstance.get(`runners/files?runid=${runnerId}`);
    files = resp.data;
  };
</script>

{#if !files || files.length == 0}
  <ErrorInfo message="No output files" icon="img alert" />
{/if}

<TableControl
  rows={files}
  columns={[
    { fieldName: 'name', header: 'Name' },
    { fieldName: 'size', header: 'Size', formatter: row => formatFileSize(row.size) },
    !electron && {
      fieldName: 'download',
      header: 'Download',
      component: DownloadLink,
      getProps: row => ({
        row,
        runnerId,
      }),
    },
    !electron && {
      fieldName: 'copy',
      header: 'Copy',
      component: CopyLink,
      getProps: row => ({
        row,
        runnerId,
      }),
    },
    !electron && {
      fieldName: 'show',
      header: 'Show',
      component: ShowLink,
      getProps: row => ({
        row,
        runnerId,
      }),
    },
  ]}
/>
