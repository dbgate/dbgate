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

  // registerCommand({
  //   id: 'perspective.arrange',
  //   category: 'Perspective',
  //   icon: 'icon arrange',
  //   name: 'Arrange',
  //   toolbar: true,
  //   isRelatedToTab: true,
  //   testEnabled: () => getCurrentEditor()?.canArrange(),
  //   onClick: () => getCurrentEditor().arrange(),
  // });
</script>

<script lang="ts">
  import {
    extractPerspectiveDatabases,
    PerspectiveDataProvider,
    PerspectiveTableNode,
    PerspectiveTreeNode,
    processPerspectiveDefaultColunns,
    shouldProcessPerspectiveDefaultColunns,
  } from 'dbgate-datalib';
  import type { ChangePerspectiveConfigFunc, PerspectiveConfig } from 'dbgate-datalib';

  import _ from 'lodash';

  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import debug from 'debug';

  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import PerspectiveTree from './PerspectiveTree.svelte';
  import PerspectiveTable from './PerspectiveTable.svelte';
  import { apiCall } from '../utility/api';
  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';
  import { PerspectiveDataLoader } from 'dbgate-datalib';
  import stableStringify from 'json-stable-stringify';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import registerCommand from '../commands/registerCommand';
  import { showModal } from '../modals/modalTools';
  import CustomJoinModal from './CustomJoinModal.svelte';
  import PerspectiveFilters from './PerspectiveFilters.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { useMultipleDatabaseInfo } from '../utility/useMultipleDatabaseInfo';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import PerspectiveDesigner from './PerspectiveDesigner.svelte';
  import { tick } from 'svelte';
  import { sleep } from '../utility/common';
  import FontIcon from '../icons/FontIcon.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import { usePerspectiveDataPatterns } from '../utility/usePerspectiveDataPatterns';

  const dbg = debug('dbgate:PerspectiveView');

  export let conid;
  export let database;
  export let driver;

  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;

  let tempRootDesignerId: string = null;

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

  // export function canArrange() {
  //   return !config.isArranged;
  // }

  // export function arrange() {
  //   // setConfig(cfg => ({
  //   //   ...cfg,
  //   //   isArranged: true,
  //   // }));
  //   runCommand('designer.arrange');
  // }

  let perspectiveDatabases = extractPerspectiveDatabases({ conid, database }, config);
  $: {
    const newDatabases = extractPerspectiveDatabases({ conid, database }, config);
    if (stableStringify(newDatabases) != stableStringify(perspectiveDatabases)) {
      perspectiveDatabases = newDatabases;
    }
  }

  $: dbInfos = useMultipleDatabaseInfo(perspectiveDatabases);
  $: loader = new PerspectiveDataLoader(apiCall);
  $: dataPatterns = usePerspectiveDataPatterns({ conid, database }, config, cache, $dbInfos, loader);
  $: rootObject = config?.nodes?.find(x => x.designerId == config?.rootDesignerId);
  $: rootDb = rootObject ? $dbInfos?.[rootObject.conid || conid]?.[rootObject.database || database] : null;
  $: tableInfo = rootDb?.tables.find(x => x.pureName == rootObject?.pureName && x.schemaName == rootObject?.schemaName);
  $: viewInfo = rootDb?.views.find(x => x.pureName == rootObject?.pureName && x.schemaName == rootObject?.schemaName);
  $: collectionInfo = rootDb?.collections.find(
    x => x.pureName == rootObject?.pureName && x.schemaName == rootObject?.schemaName
  );

  $: dataProvider = new PerspectiveDataProvider(cache, loader, $dataPatterns);
  $: root =
    tableInfo || viewInfo || collectionInfo
      ? new PerspectiveTableNode(
          tableInfo || viewInfo || collectionInfo,
          $dbInfos,
          config,
          setConfig,
          dataProvider,
          { conid, database },
          null,
          config.rootDesignerId
        )
      : null;
  $: tempRoot = root?.findNodeByDesignerId(tempRootDesignerId);

  $: {
    if (shouldProcessPerspectiveDefaultColunns(config, $dbInfos, $dataPatterns, conid, database)) {
      setConfig(cfg => processPerspectiveDefaultColunns(cfg, $dbInfos, $dataPatterns, conid, database));
    }
  }

  // $: console.log('PERSPECTIVE', config);
  // $: console.log('VIEW ROOT', root);
  // $: console.log('dataPatterns', $dataPatterns);
</script>

<HorizontalSplitter initialValue={getInitialManagerSize()} bind:size={managerSize} allowCollapseChild1>
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Choose data" name="perspectiveTree" height={'70%'}>
        {#if tempRoot && tempRoot != root}
          <div class="temp-root">
            <div>
              <FontIcon icon="img table" />
              {tempRoot.title}
            </div>
            <InlineButton
              on:click={() => {
                tempRootDesignerId = tempRoot?.parentNode?.designerId;
              }}>Go up</InlineButton
            >
          </div>
        {/if}

        <SearchBoxWrapper>
          <SearchInput placeholder="Search column or table" bind:value={filter} />
          <CloseSearchButton bind:filter />
        </SearchBoxWrapper>

        <ManagerInnerContainer width={managerSize}>
          {#if root}
            <PerspectiveTree {root} {tempRoot} {config} {setConfig} {conid} {database} {filter} />
          {/if}
        </ManagerInnerContainer>
      </WidgetColumnBarItem>

      <WidgetColumnBarItem title="Filters" name="tableFilters">
        <PerspectiveFilters {managerSize} {config} {setConfig} {conid} {database} {driver} {root} />
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  </div>

  <svelte:fragment slot="2">
    <VerticalSplitter allowCollapseChild1 allowCollapseChild2>
      <svelte:fragment slot="1">
        <PerspectiveDesigner
          {config}
          {conid}
          {database}
          {setConfig}
          dbInfos={$dbInfos}
          dataPatterns={$dataPatterns}
          {root}
          onClickTableHeader={designerId => {
            sleep(100).then(() => {
              tempRootDesignerId = designerId;
            });
          }}
        />
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

  .temp-root {
    border: 1px solid var(--theme-border);
    background-color: var(--theme-bg-1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-left: 2px;
  }
</style>
