<script lang="ts">
  import InlineButton from './InlineButton.svelte';
  import SearchInput from './SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { useDatabaseInfo, useDatabaseStatus } from '../utility/metadataLoaders';
  import SearchBoxWrapper from './SearchBoxWrapper.svelte';

  export let conid;
  export let database;

  $: objects = useDatabaseInfo({ conid, database });
  $: status = useDatabaseStatus({ conid, database });

  $: console.log('objects', $objects);
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search connection" />
  <InlineButton>Refresh</InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>CONNECTIONS</WidgetsInnerContainer>
