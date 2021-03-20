<script lang="ts">
  import _ from 'lodash';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import useFetch from '../utility/useFetch';
  import WidgetsInnerContainer from '../widgets/WidgetsInnerContainer.svelte';
  import PluginsList from './PluginsList.svelte';

  let filter = '';
  let search = '';

  $: plugins = useFetch({
    url: 'plugins/search',
    params: {
      filter: search,
    },
    defaultValue: [],
  });

  const setDebouncedFilter = _.debounce(value => (search = value), 500);

  $: setDebouncedFilter(filter);
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search extensions on web" {filter} bind:value={filter} />
</SearchBoxWrapper>
<WidgetsInnerContainer>
  <PluginsList plugins={$plugins} />
</WidgetsInnerContainer>
