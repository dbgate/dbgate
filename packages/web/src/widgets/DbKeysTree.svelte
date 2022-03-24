<script lang="ts">
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import runCommand from '../commands/runCommand';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  import DbKeysSubTree from './DbKeysSubTree.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  export let conid;
  export let database;

  let filter;
  let reloadToken = 0;

  function handleRefreshDatabase() {
    reloadToken += 1;
  }
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search keys" bind:value={filter} />
  <CloseSearchButton bind:filter />
  <InlineButton on:click={() => runCommand('new.dbKey')} title="Add new key">
    <FontIcon icon="icon plus-thick" />
  </InlineButton>
  <InlineButton on:click={handleRefreshDatabase} title="Refresh key list">
    <FontIcon icon="icon refresh" />
  </InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <DbKeysSubTree {conid} {database} root="" {reloadToken} />
</WidgetsInnerContainer>
