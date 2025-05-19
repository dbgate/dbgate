<script lang="ts" context="module">
  import AppObjectCore from './AppObjectCore.svelte';

  export const extractKey = data => data.path;
</script>

<script lang="ts">
  import openNewTab from '../utility/openNewTab';
  import { copyTextToClipboard } from '../utility/clipboard';
  import { showModal } from '../modals/modalTools';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import getElectron from '../utility/getElectron';
  import FavoriteModal from '../modals/FavoriteModal.svelte';
  import { apiCall } from '../utility/api';

  export let data;

  function createMenu() {
    return [];
    //   return [
    //     { text: 'Delete', onClick: handleDelete },
    //     { text: 'Edit', onClick: editFavorite },
    //     { text: 'Edit JSON definition', onClick: editFavoriteJson },
    //     !electron && data.urlPath && { text: 'Copy link', onClick: copyLink },
    //   ];
  }
</script>

<AppObjectCore {...$$restProps} {data} icon={'img sql-file'} title={data.title} menu={createMenu} />
