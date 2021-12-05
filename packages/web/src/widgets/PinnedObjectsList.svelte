<script lang="ts">
  import _ from 'lodash';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import { pinnedDatabases } from '../stores';
  import * as databaseAppObject from '../appobj/DatabaseAppObject.svelte';
  import { useConnectionColorFactory } from '../utility/useConnectionColor';

  const connectionColorFactory = useConnectionColorFactory(3);
</script>

<WidgetsInnerContainer>
  <AppObjectList
    list={$pinnedDatabases}
    module={databaseAppObject}
    passProps={{ connectionColorFactory: $connectionColorFactory }}
  />
</WidgetsInnerContainer>
