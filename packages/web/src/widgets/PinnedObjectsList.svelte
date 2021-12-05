<script lang="ts">
  import _ from 'lodash';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import {  pinnedDatabases } from '../stores';
  import * as databaseAppObject from '../appobj/DatabaseAppObject.svelte';

</script>

<WidgetsInnerContainer>
  <AppObjectList list={$pinnedDatabases} module={databaseAppObject} />
</WidgetsInnerContainer>
