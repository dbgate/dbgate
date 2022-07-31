<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('PerspectiveView');

  registerCommand({
    id: 'perspective.customJoin',
    category: 'Perspective',
    name: 'Custom join',
    keyText: 'CtrlOrCommand+J',
    isRelatedToTab: true,
    icon: 'icon custom-join',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().defineCustomJoin(),
  });
</script>

<script lang="ts">
  import {
    ChangeConfigFunc,
    ChangePerspectiveConfigFunc,
    getTableChildPerspectiveNodes,
    GridConfig,
    PerspectiveConfig,
    PerspectiveDataLoadProps,
    PerspectiveDataProvider,
    PerspectiveTableColumnNode,
    PerspectiveTableNode,
    PerspectiveViewNode,
  } from 'dbgate-datalib';

  import _ from 'lodash';

  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import { useDatabaseInfo, useTableInfo, useViewInfo } from '../utility/metadataLoaders';
  import debug from 'debug';

  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import PerspectiveTree from './PerspectiveTree.svelte';
  import PerspectiveTable from './PerspectiveTable.svelte';
  import { apiCall } from '../utility/api';
  import { Select } from 'dbgate-sqltree';
  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';
  import { PerspectiveDataLoader } from 'dbgate-datalib/lib/PerspectiveDataLoader';
  import stableStringify from 'json-stable-stringify';
  import createRef from '../utility/createRef';
  import { tick } from 'svelte';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import registerCommand from '../commands/registerCommand';
  import { showModal } from '../modals/modalTools';
  import CustomJoinModal from './CustomJoinModal.svelte';

  const dbg = debug('dbgate:PerspectiveView');

  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;
  export let loadedCounts;

  export let cache;

  let managerSize;
  let nextCacheRef = createRef(null);

  export const activator = createActivator('PerspectiveView', true);

  $: if (managerSize) setLocalStorage('perspectiveManagerWidth', managerSize);

  function getInitialManagerSize() {
    const width = getLocalStorage('perspectiveManagerWidth');
    if (_.isNumber(width) && width > 30 && width < 500) {
      return `${width}px`;
    }
    return '300px';
  }

  export function defineCustomJoin() {
    if (!root) return;
    showModal(CustomJoinModal, {
      config,
      setConfig,
      conid,
      database,
      root,
    });
  }

  const dbInfo = useDatabaseInfo({ conid, database });
  const tableInfo = useTableInfo({ conid, database, schemaName, pureName });
  const viewInfo = useViewInfo({ conid, database, schemaName, pureName });

  $: dataProvider = new PerspectiveDataProvider(cache, loader);
  $: loader = new PerspectiveDataLoader(apiCall);
  $: root = $tableInfo
    ? new PerspectiveTableNode($tableInfo, $dbInfo, config, setConfig, dataProvider, { conid, database }, null)
    : $viewInfo
    ? new PerspectiveViewNode($viewInfo, $dbInfo, config, setConfig, dataProvider, { conid, database }, null)
    : null;

  // $: console.log('CONFIG', config);
</script>

<HorizontalSplitter initialValue={getInitialManagerSize()} bind:size={managerSize}>
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Choose data" name="perspectiveTree" height="45%">
        <ManagerInnerContainer width={managerSize}>
          {#if root}
            <PerspectiveTree {root} {config} {setConfig} {conid} {database} />
          {/if}
        </ManagerInnerContainer>
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  </div>

  <svelte:fragment slot="2">
    <PerspectiveTable {root} {loadedCounts} {config} {setConfig} />
  </svelte:fragment>
</HorizontalSplitter>

<style>
  .left {
    display: flex;
    flex: 1;
    background-color: var(--theme-bg-0);
  }
</style>
