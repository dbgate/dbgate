<script lang="ts">
  import InlineButton from './InlineButton.svelte';
  import SearchInput from './SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { useConnectionList } from '../utility/metadataLoaders';
import SearchBoxWrapper from './SearchBoxWrapper.svelte';

  const connections = useConnectionList();
  $: console.log('CONNECTIONS', $connections);
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search connection" />
  <InlineButton>Refresh</InlineButton>
</SearchBoxWrapper>
<WidgetsInnerContainer>CONNECTIONS</WidgetsInnerContainer>
