<script lang="ts" context="module">
  import AppObjectCore from './AppObjectCore.svelte';

  export const extractKey = data => data.file;

  export async function openFavorite(favorite) {
    const { icon, tabComponent, title, props, tabdata } = favorite;
    let tabdataNew = tabdata;
    if (props.savedFile) {
      const resp = await apiCall('files/load', {
        folder: props.savedFolder,
        file: props.savedFile,
        format: props.savedFormat,
      });
      tabdataNew = {
        ...tabdata,
        editor: resp,
      };
    }
    openNewTab(
      {
        title,
        icon: icon || 'img favorite',
        props,
        tabComponent,
      },
      tabdataNew
    );
  }
</script>

<script lang="ts">
  import openNewTab from '../utility/openNewTab';
  import { trackObjectTree } from './appObjectTools';
  import { copyTextToClipboard } from '../utility/clipboard';
  import { showModal } from '../modals/modalTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import getElectron from '../utility/getElectron';
  import FavoriteModal from '../modals/FavoriteModal.svelte';
  import { apiCall } from '../utility/api';

  export let data;

  const electron = getElectron();

  const editFavorite = () => {
    trackObjectTree('edit', 'favorite_file');
    showModal(FavoriteModal, { editingData: data });
  };

  const editFavoriteJson = async () => {
    trackObjectTree('edit_json', 'favorite_file');
    const resp = await apiCall('files/load', {
      folder: 'favorites',
      file: data.file,
      format: 'text',
    });

    openNewTab(
      {
        icon: 'icon favorite',
        title: data.title,
        tabComponent: 'FavoriteEditorTab',
        props: {
          savedFile: data.file,
          savedFormat: 'text',
          savedFolder: 'favorites',
        },
      },
      { editor: JSON.stringify(JSON.parse(resp), null, 2) }
    );
  };

  const copyLink = () => {
    trackObjectTree('copy_link', 'favorite_file');
    copyTextToClipboard(`${document.location.origin}#favorite=${data.urlPath}`);
  };

  const handleDelete = () => {
    trackObjectTree('delete', 'favorite_file');
    showModal(ConfirmModal, {
      message: `Really delete favorite ${data.title}?`,
      onConfirm: () => {
        apiCall('files/delete', { file: data.file, folder: 'favorites' });
      },
    });
  };

  function createMenu() {
    return [
      { text: 'Delete', onClick: handleDelete },
      { text: 'Edit', onClick: editFavorite },
      { text: 'Edit JSON definition', onClick: editFavoriteJson },
      !electron && data.urlPath && { text: 'Copy link', onClick: copyLink },
    ];
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  icon={data.icon || 'img favorite'}
  title={data.title}
  menu={createMenu}
  on:click={() => openFavorite(data)}
/>
