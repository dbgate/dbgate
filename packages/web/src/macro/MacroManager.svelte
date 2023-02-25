<script lang="ts">
  import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as macroAppObject from '../appobj/MacroAppObject.svelte';

  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import macros from './macros';

  let filter = '';
  export let managerSize;
  export let macroCondition;
</script>

<ManagerInnerContainer width={managerSize}>
  <SearchBoxWrapper>
    <SearchInput placeholder="Search macros" bind:value={filter} />
  </SearchBoxWrapper>
  <AppObjectList
    list={_.sortBy(macros, 'title').filter(x => (macroCondition ? macroCondition(x) : true))}
    module={macroAppObject}
    {filter}
    groupFunc={data => data.group}
  />
</ManagerInnerContainer>
