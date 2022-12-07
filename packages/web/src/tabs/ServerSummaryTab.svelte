<script>
  import Link from '../elements/Link.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';

  import ObjectListControl from '../elements/ObjectListControl.svelte';
  import { apiCall } from '../utility/api';

  export let conid;

  let refreshToken = 0;
</script>

{#await apiCall('server-connections/server-summary', { conid, refreshToken })}
  <LoadingInfo message="Loading server details" wrapper />
{:then summary}
  <ObjectListControl
    collection={summary.databases}
    hideDisplayName
    title="Databases"
    emptyMessage={'No databases'}
    columns={summary.columns}
  />
{/await}
