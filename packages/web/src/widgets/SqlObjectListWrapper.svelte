<script lang="ts">
  import _ from 'lodash';
  import { currentDatabase } from '../stores';
  import SqlObjectList from './SqlObjectList.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  $: conid = _.get($currentDatabase, 'connection._id');
  $: database = _.get($currentDatabase, 'name');
</script>

{#if conid && database}
  <SqlObjectList {conid} {database} />
{:else}
  <WidgetsInnerContainer>Database not selected</WidgetsInnerContainer>
{/if}
