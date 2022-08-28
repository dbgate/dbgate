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

  registerCommand({
    id: 'perspective.arrange',
    category: 'Perspective',
    icon: 'icon arrange',
    name: 'Arrange',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor()?.canArrange(),
    onClick: () => getCurrentEditor().arrange(),
  });
</script>

<script lang="ts">
  import {
    ChangeConfigFunc,
    ChangePerspectiveConfigFunc,
    extractPerspectiveDatabases,
    getTableChildPerspectiveNodes,
    GridConfig,
    PerspectiveConfig,
    PerspectiveDataLoadProps,
    PerspectiveDataProvider,
    PerspectiveTableColumnNode,
    PerspectiveTableNode,
    processPerspectiveDefaultColunns,
    shouldProcessPerspectiveDefaultColunns,
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
  import JsonViewFilters from '../jsonview/JsonViewFilters.svelte';
  import PerspectiveFilters from './PerspectiveFilters.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { useMultipleDatabaseInfo } from '../utility/useMultipleDatabaseInfo';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import PerspectiveDesigner from './PerspectiveDesigner.svelte';
  import runCommand from '../commands/runCommand';

  const dbg = debug('dbgate:PerspectiveView');

  export let conid;
  export let database;
  export let driver;

  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;
  export let loadedCounts;

  export let cache;

  let managerSize;
  let filter;

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

  export function canArrange() {
    return !config.isArranged;
  }

  export function arrange() {
    // setConfig(cfg => ({
    //   ...cfg,
    //   isArranged: true,
    // }));
    runCommand('designer.arrange');
  }

  let perspectiveDatabases = extractPerspectiveDatabases({ conid, database }, config);
  $: {
    const newDatabases = extractPerspectiveDatabases({ conid, database }, config);
    if (stableStringify(newDatabases) != stableStringify(newDatabases)) {
      perspectiveDatabases = newDatabases;
    }
  }
  $: dbInfos = useMultipleDatabaseInfo(perspectiveDatabases);
  $: rootObject = config?.nodes?.find(x => x.designerId == config?.rootDesignerId);
  $: tableInfo = useTableInfo({ conid, database, ...rootObject });
  $: viewInfo = useViewInfo({ conid, database, ...rootObject });

  $: dataProvider = new PerspectiveDataProvider(cache, loader);
  $: loader = new PerspectiveDataLoader(apiCall);
  $: root =
    $tableInfo || $viewInfo
      ? new PerspectiveTableNode(
          $tableInfo || $viewInfo,
          $dbInfos,
          config,
          setConfig,
          dataProvider,
          { conid, database },
          null,
          config.rootDesignerId
        )
      : null;

  $: {
    if (shouldProcessPerspectiveDefaultColunns(config, $dbInfos, conid, database)) {
      setConfig(cfg => processPerspectiveDefaultColunns(cfg, $dbInfos, conid, database));
    }
    // tick().then(() => {
    //   const newConfig = processPerspectiveDefaultColunns(config, $dbInfos, conid, database);
    //   if (newConfig) {
    //     if (
    //       newConfig.nodes.filter(x => x.defaultColumnsProcessed).length >
    //       config.nodes.filter(x => x.defaultColumnsProcessed).length
    //     ) {
    //       console.log('CONFIG CHANGED');
    //       setConfig(() => newConfig);
    //     } else {
    //       console.warn('No new default columns', newConfig);
    //     }
    //   }
    // });
  }
</script>

<HorizontalSplitter initialValue={getInitialManagerSize()} bind:size={managerSize}>
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Choose data" name="perspectiveTree" height={'70%'}>
        <SearchBoxWrapper>
          <SearchInput placeholder="Search column or table" bind:value={filter} />
          <CloseSearchButton bind:filter />
        </SearchBoxWrapper>

        <ManagerInnerContainer width={managerSize}>
          {#if root}
            <PerspectiveTree {root} {config} {setConfig} {conid} {database} {filter} />
          {/if}
        </ManagerInnerContainer>
      </WidgetColumnBarItem>

      <WidgetColumnBarItem title="Filters" name="tableFilters">
        <PerspectiveFilters {managerSize} {config} {setConfig} {conid} {database} {driver} {root} />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  </div>

  <svelte:fragment slot="2">
    <VerticalSplitter>
      <svelte:fragment slot="1">
        <PerspectiveDesigner {config} {conid} {database} onChange={setConfig} dbInfos={$dbInfos} />
      </svelte:fragment>
      <svelte:fragment slot="2">
        <PerspectiveTable {root} {loadedCounts} {config} {setConfig} {conid} {database} />
      </svelte:fragment>
    </VerticalSplitter>
  </svelte:fragment>
</HorizontalSplitter>

<style>
  .left {
    display: flex;
    flex: 1;
    background-color: var(--theme-bg-0);
  }
</style>
