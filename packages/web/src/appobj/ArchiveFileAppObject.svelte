<script lang="ts" context="module">
  function openArchive(fileName, folderName) {
    openNewTab({
      title: fileName,
      icon: 'img archive',
      tooltip: `${folderName}\n${fileName}`,
      tabComponent: 'ArchiveFileTab',
      props: {
        archiveFile: fileName,
        archiveFolder: folderName,
      },
    });
  }

  export const extractKey = data => data.fileName;
  export const createMatcher = ({ fileName }) => filter => filterName(filter, fileName);
</script>

<script lang="ts">
  import { filterName } from 'dbgate-datalib';

  import { currentArchive } from '../stores';

  import axiosInstance from '../utility/axiosInstance';
  import openNewTab from '../utility/openNewTab';
  import AppObjectCore from './AppObjectCore.svelte';

  export let data;

  const handleDelete = () => {
    axiosInstance.post('archive/delete-file', { file: data.fileName, folder: data.folderName });
  };
  const handleOpenRead = () => {
    openArchive(data.fileName, data.folderName);
  };
  const handleOpenWrite = () => {
    openNewTab({
      title: data.fileName,
      icon: 'img archive',
      tabComponent: 'FreeTableTab',
      props: {
        initialArgs: {
          functionName: 'archiveReader',
          props: {
            fileName: data.fileName,
            folderName: data.folderName,
          },
        },
        archiveFile: data.fileName,
        archiveFolder: data.folderName,
      },
    });
  };
  const handleClick = () => {
    openArchive(data.fileName, data.folderName);
  };

  function createMenu() {
    return [
      { text: 'Open (readonly)', onClick: handleOpenRead },
      { text: 'Open in free table editor', onClick: handleOpenWrite },
      { text: 'Delete', onClick: handleDelete },
    ];
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.fileName}
  icon="img archive"
  menu={createMenu}
  on:click={handleClick}
/>
