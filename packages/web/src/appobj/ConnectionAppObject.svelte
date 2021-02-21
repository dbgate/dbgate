<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import { currentDatabase, openedConnections } from '../stores';

  export let commonProps;
  export let data;

  let statusIcon = null;
  let statusTitle = null;

  $: {
    const { _id, status } = data;
    if ($openedConnections.includes(_id)) {
      if (!status) statusIcon = 'icon loading';
      else if (status.name == 'pending') statusIcon = 'icon loading';
      else if (status.name == 'ok') statusIcon = 'img ok';
      else statusIcon = 'img error';
      if (status && status.name == 'error') {
        statusTitle = status.message;
      }
    }
  }

</script>

<AppObjectCore
  {...commonProps}
  title={data.displayName || data.server}
  icon="img server"
  isBold={_.get($currentDatabase, 'connection._id') == data._id}
  statusIcon={statusIcon}
  statusTitle={statusTitle}
  on:click
  on:click={() => ($openedConnections = _.uniq([...$openedConnections, data._id]))}
/>
