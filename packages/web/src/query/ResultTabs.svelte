<script lang="ts">
  import _ from 'lodash';

  import { onMount, tick } from 'svelte';

  import JslDataGrid from '../datagrid/JslDataGrid.svelte';
  import TabControl from '../elements/TabControl.svelte';
  import { allResultsInOneTabDefault } from '../stores';
  import { apiOff, apiOn } from '../utility/api';
  import useEffect from '../utility/useEffect';
  import AllResultsTab from './AllResultsTab.svelte';

  export let tabs = [];
  export let sessionId;
  export let executeNumber;
  export let driver;

  export let resultCount;

  onMount(() => {
    allResultsInOneTab = $allResultsInOneTabDefault;
  });

  let allResultsInOneTab = null;
  let resultInfos = [];
  let domTabs;

  $: resultCount = resultInfos.length;

  const handleResultSet = async props => {
    const { jslid, resultIndex } = props;
    resultInfos = [...resultInfos, { jslid, resultIndex }];
    await tick();
    const currentTab = allTabs[domTabs.getValue()];
    if (!currentTab?.isResult) domTabs.setValue(_.findIndex(allTabs, x => x.isResult));
  };

  $: oneTab = allResultsInOneTab ?? $allResultsInOneTabDefault;

  $: allTabs = [
    ...tabs,

    ...(oneTab && resultInfos.length > 0
      ? [
          {
            label: 'Results',
            isResult: true,
            component: AllResultsTab,
            props: {
              resultInfos,
            },
          },
        ]
      : resultInfos.map((info, index) => ({
          label: `Result ${index + 1}`,
          isResult: true,
          component: JslDataGrid,
          props: { jslid: info.jslid, driver },
        }))),
  ];

  $: {
    if (executeNumber >= 0) {
      resultInfos = [];
      if (domTabs) domTabs.setValue(0);
    }
  }

  $: effect = useEffect(() => {
    return onSession(sessionId);
  });
  function onSession(sid) {
    if (sid) {
      apiOn(`session-recordset-${sid}`, handleResultSet);
      return () => {
        apiOff(`session-recordset-${sid}`, handleResultSet);
      };
    }
    return () => {};
  }
  $: $effect;

  function setOneTabValue(value) {
    allResultsInOneTab = value;
    $allResultsInOneTabDefault = value;
  }
</script>

<TabControl
  bind:this={domTabs}
  tabs={allTabs}
  menu={resultInfos.length > 0 && [
    oneTab
      ? { text: 'Every result in single tab', onClick: () => setOneTabValue(false) }
      : { text: 'All results in one tab', onClick: () => setOneTabValue(true) },
  ]}
>
  <slot name="0" slot="0" />
  <slot name="1" slot="1" />
  <slot name="2" slot="2" />
  <slot name="3" slot="3" />
  <slot name="4" slot="4" />
  <slot name="5" slot="5" />
  <slot name="6" slot="6" />
  <slot name="7" slot="7" />
</TabControl>
