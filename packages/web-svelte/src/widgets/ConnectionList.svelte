<script>
  import InlineButton from './InlineButton.svelte';
  import SearchInput from './SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
</script>

<div class="search-box">
  <SearchInput placeholder="Search connection" />
  <InlineButton>Refresh</InlineButton>
</div>
<WidgetsInnerContainer>CONNECTIONS</WidgetsInnerContainer>

<style>
  .search-box {
    display: flex;
    margin-bottom: 5px;
  }
</style>
