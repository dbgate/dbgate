<script lang="ts">
  import _ from 'lodash';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import { currentDatabase, pinnedDatabases, pinnedTables } from '../stores';
  import * as pinnedAppObject from '../appobj/PinnedAppObject.svelte';
  import { useConnectionColorFactory } from '../utility/useConnectionColor';
  import AboutModal from '../modals/AboutModal.svelte';

  const connectionColorFactory = useConnectionColorFactory(3);

  $: filteredTables = $pinnedTables.filter(
    x => x.conid == $currentDatabase?.connection?._id && x.database == $currentDatabase?.name
  );
</script>

<WidgetsInnerContainer>
  <AppObjectList
    list={[...$pinnedDatabases, ...filteredTables]}
    module={pinnedAppObject}
    passProps={{ connectionColorFactory: $connectionColorFactory }}
  />
</WidgetsInnerContainer>
