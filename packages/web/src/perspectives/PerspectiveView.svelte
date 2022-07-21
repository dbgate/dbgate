<script lang="ts">
  import {
    getTableChildPerspectiveNodes,
    PerspectiveDataLoadProps,
    PerspectiveDataProvider,
    PerspectiveTableColumnNode,
    PerspectiveTableNode,
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

  const dbg = debug('dbgate:PerspectiveView');

  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  export let config;
  export let setConfig;

  export let cache;
  export let setCache;

  let managerSize;

  $: if (managerSize) setLocalStorage('perspectiveManagerWidth', managerSize);

  function getInitialManagerSize() {
    const width = getLocalStorage('perspectiveManagerWidth');
    if (_.isNumber(width) && width > 30 && width < 500) {
      return `${width}px`;
    }
    return '300px';
  }

  const dbInfo = useDatabaseInfo({ conid, database });
  const tableInfo = useTableInfo({ conid, database, schemaName, pureName });
  const viewInfo = useViewInfo({ conid, database, schemaName, pureName });

  // $: console.log('tableInfo', $tableInfo);
  // $: console.log('viewInfo', $viewInfo);

  // function getTableNodes(table, dbInfo, config, setConfig) {
  //   return getTableChildPerspectiveNodes(table, dbInfo, config, setConfig, null);
  // }

  // function getViewNodes(view, dbInfo, config, setConfig) {
  //   return [];
  // }

  // // $: console.log('CFG', config);

  // $: nodes = $tableInfo
  //   ? getTableNodes($tableInfo, $dbInfo, config, setConfig)
  //   : $viewInfo
  //   ? getViewNodes($viewInfo, $dbInfo, config, setConfig)
  //   : null;

  // async function loader(props: PerspectiveDataLoadProps) {
  //   const { schemaName, pureName, bindingColumns, bindingValues, dataColumns } = props;
  //   const select: Select = {
  //     commandType: 'select',
  //     from: {
  //       name: { schemaName, pureName },
  //     },
  //     columns: dataColumns?.map(columnName => ({
  //       exprType: 'column',
  //       columnName,
  //       source: {
  //         name: { schemaName, pureName },
  //       },
  //     })),
  //     selectAll: !dataColumns,
  //     orderBy: dataColumns
  //       ? [
  //           {
  //             exprType: 'column',
  //             direction: 'ASC',
  //             columnName: dataColumns[0],
  //             source: {
  //               name: { schemaName, pureName },
  //             },
  //           },
  //         ]
  //       : null,
  //     range: props.range,
  //   };
  //   if (bindingColumns?.length == 1) {
  //     select.where = {
  //       conditionType: 'in',
  //       expr: {
  //         exprType: 'column',
  //         columnName: bindingColumns[0],
  //         source: {
  //           name: { schemaName, pureName },
  //         },
  //       },
  //       values: bindingValues,
  //     };
  //   }

  //   dbg(`LOAD DATA, table=${props.pureName}, columns=${props.dataColumns?.join(',')}, range=${props.range}}`);

  //   const response = await apiCall('database-connections/sql-select', {
  //     conid,
  //     database,
  //     select,
  //   });

  //   if (response.errorMessage) return response;
  //   return response.rows;
  // }

  $: loader = new PerspectiveDataLoader(apiCall, dbg);
  $: dataProvider = new PerspectiveDataProvider(cache, setCache, loader);
  $: root = $tableInfo
    ? new PerspectiveTableNode($tableInfo, $dbInfo, config, setConfig, dataProvider, { conid, database }, null)
    : null;
</script>

<HorizontalSplitter initialValue={getInitialManagerSize()} bind:size={managerSize}>
  <div class="left" slot="1">
    <WidgetColumnBar>
      <WidgetColumnBarItem title="Choose data" name="perspectiveTree" height="45%">
        <ManagerInnerContainer width={managerSize}>
          {#if root}
            <PerspectiveTree {root} />
          {/if}
        </ManagerInnerContainer>
      </WidgetColumnBarItem>
    </WidgetColumnBar>
  </div>

  <svelte:fragment slot="2">
    <PerspectiveTable {root} />
  </svelte:fragment>
</HorizontalSplitter>

<style>
  .left {
    display: flex;
    flex: 1;
    background-color: var(--theme-bg-0);
  }
</style>
