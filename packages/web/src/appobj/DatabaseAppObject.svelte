<script lang="ts" context="module">
  export const extractKey = props => props.name;
</script>

<script lang="ts">
  import _ from 'lodash';

  import { currentDatabase } from '../stores';

  import AppObjectCore from './AppObjectCore.svelte';

  export let data;
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.name}
  icon="img database"
  isBold={_.get($currentDatabase, 'connection._id') == _.get(data.connection, '_id') &&
    _.get($currentDatabase, 'name') == data.name}
  on:click={() => ($currentDatabase = data)}
/>
