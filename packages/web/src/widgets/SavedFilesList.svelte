<script lang="ts">
import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
import * as savedFileAppObject from '../appobj/SavedFileAppObject.svelte';
import { useFiles } from '../utility/metadataLoaders';

  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  const sqlFiles = useFiles({ folder: 'sql' });
  const shellFiles = useFiles({ folder: 'shell' });
  const markdownFiles = useFiles({ folder: 'markdown' });
  const chartFiles = useFiles({ folder: 'charts' });
  const queryFiles = useFiles({ folder: 'query' });

  $: files = [
    ...($sqlFiles || []),
    ...($shellFiles || []),
    ...($markdownFiles || []),
    ...($chartFiles || []),
    ...($queryFiles || []),
  ];

</script>

<WidgetsInnerContainer>
  <AppObjectList list={files} module={savedFileAppObject} groupFunc={data => _.startCase(data.folder)} />
</WidgetsInnerContainer>
