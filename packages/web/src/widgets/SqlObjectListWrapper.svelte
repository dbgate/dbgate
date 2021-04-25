<script lang="ts">
  import _ from 'lodash';
  import { currentDatabase } from '../stores';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import SqlObjectList from './SqlObjectList.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  $: conid = _.get($currentDatabase, 'connection._id');
  $: singleDatabase = _.get($currentDatabase, 'connection.singleDatabase');
  $: database = _.get($currentDatabase, 'name');
</script>

{#if conid && (database || singleDatabase)}
  <SqlObjectList {conid} {database} />
{:else}
  <WidgetsInnerContainer>
    <ErrorInfo message="Database not selected" icon="img alert" />
  </WidgetsInnerContainer>
{/if}
