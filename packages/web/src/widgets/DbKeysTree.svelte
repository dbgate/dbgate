<script lang="ts">
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  import DbKeysSubTree from './DbKeysSubTree.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  export let conid;
  export let database;

  let filter;

  function handleRefreshDatabase() {}
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search keys" bind:value={filter} />
  <CloseSearchButton bind:filter />
  <InlineButton on:click={handleRefreshDatabase} title="Refresh key list">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <DbKeysSubTree {conid} {database} root="" />
</WidgetsInnerContainer>
