<script lang="ts">
  import _, { result } from 'lodash';

  import { onMount, tick } from 'svelte';

  import JslDataGrid from '../datagrid/JslDataGrid.svelte';
  import TabControl from '../elements/TabControl.svelte';
  import { allResultsInOneTabDefault } from '../stores';
  import { apiOff, apiOn } from '../utility/api';
  import useEffect from '../utility/useEffect';
  import AllResultsTab from './AllResultsTab.svelte';
  import JslChart from '../charts/JslChart.svelte';
  import { isProApp } from '../utility/proTools';

  export let tabs = [];
  export let sessionId;
  export let executeNumber;
  export let driver;

  export let resultCount;
  export let onSetFrontMatterField;
  export let onGetFrontMatter;

  onMount(() => {
    allResultsInOneTab = $allResultsInOneTabDefault;
  });

  let allResultsInOneTab = null;
  let resultInfos = [];
  let charts = [];
  let domTabs;

  $: resultCount = resultInfos.length;

  const handleResultSet = async props => {
    const { jslid, resultIndex } = props;
    resultInfos = [...resultInfos, { jslid, resultIndex }];
    await tick();
    const currentTab = allTabs[domTabs.getValue()];
    if (!currentTab?.isResult) domTabs.setValue(_.findIndex(allTabs, x => x.isResult));
  };

  const handleCharts = async props => {
    if (!isProApp()) {
      return;
    }
    charts = [
      ...charts,
      {
        jslid: props.jslid,
        charts: props.charts,
        resultIndex: props.resultIndex,
      },
    ];
    const selectedChart = onGetFrontMatter?.()?.['selected-chart'];
    await tick();
    if (selectedChart && props.resultIndex == selectedChart - 1) {
      domTabs.setValue(_.findIndex(allTabs, x => x.isChart && x.resultIndex === props.resultIndex));
    }
    // console.log('Charts received for jslid:', props.jslid, 'Charts:', props.charts);
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
          resultIndex: info.resultIndex,
          props: { jslid: info.jslid, driver, onOpenChart: () => handleOpenChart(info.resultIndex) },
        }))),
    ...charts.map((info, index) => ({
      label: `Chart ${info.resultIndex + 1}`,
      isChart: true,
      resultIndex: info.resultIndex,
      component: JslChart,
      props: {
        jslid: info.jslid,
        initialCharts: info.charts,
        onCloseChart: () => {
          charts = charts.filter(x => x.resultIndex !== info.resultIndex);
          onSetFrontMatterField?.(`chart-${info.resultIndex + 1}`, undefined);
          onSetFrontMatterField?.(`selected-chart`, undefined);
          const value = _.findIndex(allTabs, x => x.isResult && x.resultIndex === info.resultIndex);
          domTabs.setValue(value >= 0 ? value : 0);
        },
        onEditDefinition: definition => {
          onSetFrontMatterField?.(`chart-${info.resultIndex + 1}`, definition ?? undefined);
        },
      },
    })),
  ];

  $: {
    if (executeNumber >= 0) {
      resultInfos = [];
      charts = [];
      if (domTabs) domTabs.setValue(0);
    }
  }

  $: effect = useEffect(() => {
    return onSession(sessionId);
  });
  function onSession(sid) {
    if (sid) {
      apiOn(`session-recordset-${sid}`, handleResultSet);
      apiOn(`session-charts-${sid}`, handleCharts);
      return () => {
        apiOff(`session-recordset-${sid}`, handleResultSet);
        apiOff(`session-charts-${sid}`, handleCharts);
      };
    }
    return () => {};
  }
  $: $effect;

  function setOneTabValue(value) {
    allResultsInOneTab = value;
    $allResultsInOneTabDefault = value;
  }

  async function handleOpenChart(resultIndex) {
    const chartTab = _.find(allTabs, x => x.isChart && x.resultIndex === resultIndex);
    if (chartTab) {
      domTabs.setValue(_.findIndex(allTabs, x => x.isChart && x.resultIndex === resultIndex));
    } else {
      charts = [
        ...charts,
        {
          jslid: resultInfos[resultIndex].jslid,
          charts: [],
          resultIndex,
        },
      ];
      await tick();
      domTabs.setValue(_.findIndex(allTabs, x => x.isChart && x.resultIndex === resultIndex));
    }
    onSetFrontMatterField?.('selected-chart', resultIndex + 1);
  }

  export function openCurrentChart() {
    const currentIndex = domTabs.getValue();
    // console.log('Current index:', currentIndex);
    const currentTab = allTabs[currentIndex];
    // console.log('Current tab:', currentTab);
    if (currentTab?.isChart) {
      return;
    }
    const resultIndex = currentTab?.resultIndex;
    // console.log('Result index:', resultIndex);
    if (resultIndex != null) {
      handleOpenChart(resultIndex);
    }
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
  onUserChange={value => {
    if (allTabs[value].isChart) {
      onSetFrontMatterField?.(`selected-chart`, allTabs[value].resultIndex + 1);
    } else {
      onSetFrontMatterField?.(`selected-chart`, undefined);
    }
  }}
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
