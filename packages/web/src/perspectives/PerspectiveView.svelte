<script lang="ts">
  import _ from 'lodash';

  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import { useTableInfo, useViewInfo } from '../utility/metadataLoaders';

  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import PerspectiveColumns from './PerspectiveColumns.svelte';
  import PerspectiveCore from './PerspectiveCore.svelte';

  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  let managerSize;

  $: if (managerSize) setLocalStorage('perspectiveManagerWidth', managerSize);

  function getInitialManagerSize() {
    const width = getLocalStorage('perspectiveManagerWidth');
    if (_.isNumber(width) && width > 30 && width < 500) {
      return `${width}px`;
    }
    return '300px';
  }

  const tableInfo = useTableInfo({ conid, database, schemaName, pureName });
  const viewInfo = useViewInfo({ conid, database, schemaName, pureName });

  $: console.log('tableInfo', $tableInfo);
  $: console.log('viewInfo', $viewInfo);
</script>

<HorizontalSplitter initialValue={getInitialManagerSize()} bind:size={managerSize}>
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Columns" name="columns" height="45%">
        <PerspectiveColumns />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  </div>

  <svelte:fragment slot="2">
    <PerspectiveCore />
  </svelte:fragment>
</HorizontalSplitter>

<style>
  .left {
    display: flex;
    flex: 1;
    background-color: var(--theme-bg-0);
  }
</style>
