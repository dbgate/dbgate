<script lang="ts">
  import _ from 'lodash';
  import AppObjectCore from './AppObjectCore.svelte';
  import { currentDatabase, openedConnections } from '../stores';

  export let commonProps;
  export let data;

  function getStatusIcon(opened) {
    const { _id, status } = data;
    if (opened.includes(_id)) {
      if (!status) return 'icon loading';
      if (status.name == 'pending') return 'icon loading';
      if (status.name == 'ok') return 'img ok';
      return 'img error';
    }
  }
</script>

<AppObjectCore
  {...commonProps}
  title={data.displayName || data.server}
  icon="img server"
  isBold={_.get($currentDatabase, 'connection._id') == data._id}
  statusIcon={getStatusIcon($openedConnections)}
  statusTitle={data.status && data.status.name == 'error' ? data.status.message : null}
  on:click={() => ($openedConnections = _.uniq([...$openedConnections, data._id]))}
/>
