<script lang="ts">
  import _ from 'lodash';
  import ErrorInfo from '../elements/ErrorInfo.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import { useApiCall } from '../utility/api';
  import WidgetsInnerContainer from '../widgets/WidgetsInnerContainer.svelte';
  import PluginsList from './PluginsList.svelte';
  import { filterName } from 'dbgate-tools';

  let filter = '';
  // let search = '';

  $: plugins = useApiCall('plugins/search', { filter: '' }, []);

  // const setDebouncedFilter = _.debounce(value => (search = value), 500);
  //
  // $: setDebouncedFilter(filter);
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search extensions on web" {filter} bind:value={filter} />
</SearchBoxWrapper>
<WidgetsInnerContainer>
  {#if $plugins?.errorMessage}
    <ErrorInfo message={$plugins?.errorMessage} />
  {:else}
    <PluginsList plugins={$plugins.filter(i => filterName(filter, i.name))} />
  {/if}
</WidgetsInnerContainer>
