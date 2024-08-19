<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('PerspectiveTable');

  registerCommand({
    id: 'perspective.openJson',
    category: 'Perspective',
    name: 'Open JSON',
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor()?.openJsonEnabled(),
    onClick: () => getCurrentEditor().openJson(),
  });
</script>

<script lang="ts">
  import {
    PerspectiveDisplay,
    PerspectivePatternColumnNode,
    PerspectiveTableColumnNode,
    PerspectiveTreeNode,
    PERSPECTIVE_PAGE_SIZE,
  } from 'dbgate-datalib';
  import type { ChangePerspectiveConfigFunc, PerspectiveConfig } from 'dbgate-datalib';
  import _ from 'lodash';
  import { onMount, tick } from 'svelte';
  import resizeObserver from '../utility/resizeObserver';
  import debug from 'debug';
  import contextMenu from '../utility/contextMenu';
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import registerCommand from '../commands/registerCommand';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { openJsonDocument } from '../tabs/JsonTab.svelte';
  import PerspectiveCell from './PerspectiveCell.svelte';
  import DataGridCell from '../datagrid/DataGridCell.svelte';
  import PerspectiveLoadingIndicator from './PerspectiveLoadingIndicator.svelte';
  import PerspectiveHeaderControl from './PerspectiveHeaderControl.svelte';
  import createRef from '../utility/createRef';
  import { getPerspectiveNodeMenu } from './perspectiveMenu';
  import openNewTab from '../utility/openNewTab';
  import { getFilterValueExpression } from 'dbgate-filterparser';
  import StatusBarTabItem from '../widgets/StatusBarTabItem.svelte';

  const TABS_BY_FIELD = {
    tables: {
      text: 'table',
      tabComponent: 'TableDataTab',
      icon: 'img table',
    },
    views: {
      text: 'view',
      tabComponent: 'ViewDataTab',
      icon: 'img view',
    },
    collections: {
      text: 'collection',
      tabComponent: 'CollectionDataTab',
      icon: 'img collection',
    },
  };

  const dbg = debug('dbgate:PerspectiveTable');
  export const activator = createActivator('PerspectiveTable', true, ['Designer']);

  export let root: PerspectiveTreeNode;
  export let loadedCounts;
  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;
  export let conid;
  export let database;

  let dataRows;
  let domWrapper;
  let domTable;
  let errorMessage;
  let rowCount;
  let isLoading = false;
  let isLoadQueued = false;
  const lastVisibleRowIndexRef = createRef(0);
  const disableLoadNextRef = createRef(false);

  // Essential function !!
  // Fills nested data into parentRows (assigns into array parentRows[i][node.fieldName])
  // eg. when node is CustomJoinTreeNode, loads data from data provider
  async function loadLevelData(node: PerspectiveTreeNode, parentRows: any[], counts) {
    // console.log('loadLevelData', node.codeName, node.fieldName, parentRows);
    // console.log('COUNTS', node.codeName, counts);
    dbg('load level data', counts);
    // const loadProps: PerspectiveDataLoadPropsWithNode[] = [];
    const loadChildNodes = [];
    const loadChildRows = [];
    const loadProps = node.getNodeLoadProps(parentRows);
    let { rows, incomplete } = await node.dataProvider.loadData({
      ...loadProps,
      topCount: counts[node.designerId] || PERSPECTIVE_PAGE_SIZE,
    });
    // console.log('ROWS', rows, node.isRoot);

    if (node.isRoot) {
      parentRows.push(...rows);
      // console.log('PUSH PARENTROWS', parentRows);

      if (incomplete) {
        parentRows.push({
          incompleteRowsIndicator: [node.designerId],
        });
      }
    } else if (!node.preloadedLevelData) {
      // console.log('LOADED ROWS', rows);
      let lastRowWithChildren = null;
      for (const parentRow of parentRows) {
        const childRows = rows.filter(row => node.matchChildRow(parentRow, row));
        parentRow[node.fieldName] = childRows;
        if (childRows.length > 0) {
          lastRowWithChildren = parentRow;
        }
      }
      if (incomplete && lastRowWithChildren) {
        lastRowWithChildren[node.fieldName].push({
          incompleteRowsIndicator: [node.designerId],
        });
      }
    } else {
      // this is needed for nested call
      rows = _.compact(_.flatten(parentRows.map(x => x[node.fieldName])));
    }

    // console.log('TESTING NODE', node);
    // console.log('ROWS', rows);
    for (const child of node.childNodes) {
      // console.log('TEST CHILD FOR LOAD', child);
      // console.log(child.isExpandable, child.isCheckedNode, child.preloadedLevelData);
      if (child.isExpandable && (child.isCheckedNode || child.preloadedLevelData)) {
        // console.log('TESTED OK');
        // if (child.preloadedLevelData) console.log('LOADING CHILD DATA', rows);
        // console.log(child.preloadedLevelData, child);
        // console.log('LOADING FOR CHILD', child.codeName, child.columnName, child);
        // console.log('CALL CHILD', child.codeName, rows, parentRows);
        await loadLevelData(
          child,
          rows,
          // node.preloadedLevelData
          //   ? _.compact(_.flatten(parentRows.map(x => x[child.columnName])))
          //   : child.preloadedLevelData
          //   ? parentRows
          //   : rows,
          // child.preloadedLevelData
          //   ? _.compact(_.flatten(parentRows.map(x => x[child.columnName])))
          //   : node.preloadedLevelData
          //   ? parentRows
          //   : rows,

          counts
        );
        // loadProps.push(child.getNodeLoadProps());
      }
    }

    //   loadProps.push({
    //     props: node.getNodeLoadProps(parentRows),
    //     node,
    //   });

    // const grouped = groupPerspectiveLoadProps(...loadProps);
    // for (const item of grouped) {
    //   const rows = await item.node.loader(item.props);
    //   if (item.node.isRoot) {
    //     parentRows.push(...rows);
    //   } else {
    //     const childRows = rows.filter(row => node.matchChildRow(row));
    //   }
    // }
  }

  async function loadData(node: PerspectiveTreeNode, counts) {
    if (isLoading) {
      isLoadQueued = true;
      return;
    } else {
      isLoadQueued = false;
    }
    // console.log('LOADING', node);
    if (!node) return;
    const rows = [];
    isLoading = true;
    try {
      await loadLevelData(node, rows, counts);
      dataRows = rows;
      dbg('data rows', rows);
      errorMessage = null;

      rowCount = await node.dataProvider.loadRowCount(root.getNodeLoadProps([]));
    } catch (err) {
      console.error(err);
      errorMessage = err.message;
      dataRows = null;
      rowCount = null;
    }
    isLoading = false;
    // console.log('DISPLAY ROWS', rows);
    // const rows = await node.loadLevelData();
    // for (const child of node.childNodes) {
    //   const loadProps = [];
    //   if (child.isExpandable && child.isChecked) {
    //     loadProps.push(child.getNodeLoadProps());
    //   }
    // }

    if (isLoadQueued) {
      loadData(root, $loadedCounts);
    }
  }

  export function openJson() {
    openJsonDocument(dataRows);
  }

  export function openJsonEnabled() {
    return dataRows != null;
  }

  onMount(() => {});

  $: loadData(root, $loadedCounts);
  $: display = root && dataRows ? new PerspectiveDisplay(root, dataRows) : null;

  $: {
    display;
    disableLoadNextRef.set(false);
    checkLoadAdditionalData();
  }

  function buildMenu({ targetElement, registerCloseHandler }) {
    const res = [];
    const td = targetElement.closest('td') || targetElement.closest('th');
    const isHeader = !!targetElement.closest('th');

    if (td) {
      const tr = td.closest('tr');

      const columnIndex = td.getAttribute('data-column');
      const column = display?.columns?.[columnIndex];
      if (column)
        res.push(
          getPerspectiveNodeMenu({
            config,
            conid,
            database,
            node: column.dataNode,
            root,
            setConfig,
            designerId: null,
          })
        );
      td.classList.add('highlight');
      registerCloseHandler(() => {
        td.classList.remove('highlight');
      });

      const tableNodeDesignerId = td.getAttribute('data-tableNodeDesignerId');
      const tableNode = root?.findNodeByDesignerId(tableNodeDesignerId);

      if (tableNode?.headerTableAttributes) {
        const { pureName, schemaName, conid, database, objectTypeField } = tableNode?.headerTableAttributes;
        console.log('objectTypeField', objectTypeField);
        const tab = TABS_BY_FIELD[objectTypeField];
        if (tab) {
          res.push({
            text: `Open ${tab.text} ${pureName}`,
            onClick: () => {
              openNewTab({
                title: pureName,
                icon: tab.icon,
                tabComponent: tab.tabComponent,
                props: {
                  schemaName,
                  pureName,
                  conid: conid,
                  database: database,
                  objectTypeField,
                },
              });
            },
          });
        }
      }

      const setColumnDisplay = type => {
        setConfig(cfg => ({
          ...cfg,
          nodes: cfg.nodes.map(n =>
            n.designerId == column?.dataNode?.parentNode?.designerId
              ? {
                  ...n,
                  columnDisplays: { ...n.columnDisplays, [column.dataNode.columnName]: type },
                }
              : n
          ),
        }));
      };

      if (isHeader && !tableNode?.headerTableAttributes) {
        res.push({
          text: `Change display (${_.startCase(
            config.nodes.find(x => x.designerId == column?.dataNode?.parentNode?.designerId)?.columnDisplays?.[
              column.dataNode.columnName
            ] || 'default'
          )})`,
          submenu: [
            {
              text: 'Default',
              onClick: () => setColumnDisplay('default'),
            },
            {
              text: 'JSON',
              onClick: () => setColumnDisplay('json'),
            },
            {
              text: 'Image',
              onClick: () => setColumnDisplay('image'),
            },
            {
              text: 'Text',
              onClick: () => setColumnDisplay('text'),
            },
            {
              text: 'Force Text',
              onClick: () => setColumnDisplay('forceText'),
            },
          ],
        });
      }

      if (tableNode?.supportsParentFilter) {
        const isParentFilter = tableNode?.isParentFilter;
        res.push({
          text: isParentFilter ? 'Cancel filter parent rows' : 'Filter parent rows',
          onClick: () => {
            setConfig(
              cfg => ({
                ...cfg,
                nodes: cfg.nodes.map(n =>
                  n.designerId == tableNode?.designerId ? { ...n, isParentFilter: !isParentFilter } : n
                ),
              }),
              true
            );
          },
        });
      }

      const rowIndex = tr?.getAttribute('data-rowIndex');
      if (rowIndex != null) {
        const value = display.rows[rowIndex].rowData[columnIndex];
        const { dataNode } = column;

        if (
          dataNode.filterInfo &&
          (dataNode instanceof PerspectiveTableColumnNode || dataNode instanceof PerspectivePatternColumnNode)
        ) {
          const { table } = dataNode;

          const tab = TABS_BY_FIELD[table.objectTypeField];
          const filterExpression = getFilterValueExpression(
            value,
            dataNode instanceof PerspectiveTableColumnNode ? dataNode.column.dataType : null
          );

          if (tab) {
            res.push({
              text: 'Open filtered grid',
              onClick: () => {
                openNewTab(
                  {
                    title: table.pureName,
                    icon: tab.icon,
                    tabComponent: tab.tabComponent,
                    props: {
                      schemaName: table.schemaName,
                      pureName: table.pureName,
                      conid,
                      database,
                      objectTypeField: table.objectTypeField,
                    },
                  },
                  {
                    grid: {
                      filters: {
                        [dataNode.columnName]: filterExpression,
                      },
                      // isFormView: true,
                    },
                  },
                  {
                    forceNewTab: true,
                  }
                );
              },
            });
          }

          res.push({
            text: 'Filter this value',
            onClick: () => {
              setConfig(cfg => ({
                ...cfg,
                nodes: cfg.nodes.map(n =>
                  n.designerId == dataNode?.parentNode?.designerId
                    ? {
                        ...n,
                        filters: {
                          ...n.filters,
                          [dataNode.columnName]: filterExpression,
                        },
                      }
                    : n
                ),
              }));
            },
          });
        }
      }
    }

    res.push([
      { divider: true },
      { command: 'perspective.refresh' },
      { command: 'perspective.openJson' },
      { command: 'perspective.customJoin' },
    ]);

    return res;
  }

  function getLastVisibleRowIndex() {
    var rows = domTable.querySelectorAll('tbody>tr');
    const wrapBox = domWrapper.getBoundingClientRect();

    function indexIsLastVisible(index) {
      if (index < 0 || index >= rows.length) {
        return false;
      }

      const box = rows[index].getBoundingClientRect();

      if (index == rows.length - 1) {
        return wrapBox.bottom >= box.top;
      }

      return box.top <= wrapBox.bottom && box.bottom >= wrapBox.bottom;
    }

    const lastValue = lastVisibleRowIndexRef.get();

    let d = 0;
    while (lastValue - d >= 0 || lastValue + d < rows.length) {
      if (indexIsLastVisible(lastValue - d)) {
        lastVisibleRowIndexRef.set(lastValue - d);
        return lastValue - d;
      }
      if (indexIsLastVisible(lastValue + d)) {
        lastVisibleRowIndexRef.set(lastValue + d);
        return lastValue + d;
      }
      d += 1;
    }

    return 0;

    // let rowIndex = 0;
    // // let lastTr = null;
    // for (const row of rows) {
    //   const box = row.getBoundingClientRect();
    //   // console.log('BOX', box);
    //   if (box.y > wrapBox.bottom) {
    //     break;
    //   }
    //   // if (box.y > domWrapper.scrollTop + wrapBox.height) {
    //   //   break;
    //   // }
    //   // lastTr = row;
    //   rowIndex += 1;
    // }
    // return rowIndex;
  }

  async function checkLoadAdditionalData() {
    if (!display) return;
    await tick();
    if (!domTable) return;
    if (!display) return;
    if (disableLoadNextRef.get()) return;

    const rowIndex = getLastVisibleRowIndex();

    // console.log('LAST VISIBLE', rowIndex);

    const growIndicators = _.keys(display.loadIndicatorsCounts).filter(
      indicator => rowIndex + 1 >= display.loadIndicatorsCounts[indicator]
    );

    // console.log('growIndicators', growIndicators);
    // console.log('display.loadIndicatorsCounts IN', display.loadIndicatorsCounts);
    // console.log('rowIndex', rowIndex);

    if (growIndicators.length > 0) {
      disableLoadNextRef.set(true);
      dbg('load next', growIndicators);
      loadedCounts.update(counts => {
        const res = { ...counts };
        for (const id of growIndicators) {
          res[id] = (res[id] || PERSPECTIVE_PAGE_SIZE) + PERSPECTIVE_PAGE_SIZE;
        }
        return res;
      });
    }

    // console.log('LAST VISIBLE ROW', rowIndex, wrapBox.height, lastTr, lastTr.getBoundingClientRect());

    // var start = 0;
    // var end = rows.length;
    // var count = 0;

    // while (start != end) {
    //   var mid = start + Math.floor((end - start) / 2);
    //   if ($(rows[mid]).offset().top < document.documentElement.scrollTop) start = mid + 1;
    //   else end = mid;
    // }

    // console.log('SCROLL', domTable.querySelector('tr:visible:last'));
  }

  // $: console.log('display.loadIndicatorsCounts', display?.loadIndicatorsCounts);
</script>

<div
  class="wrapper"
  bind:this={domWrapper}
  use:resizeObserver={true}
  use:contextMenu={buildMenu}
  on:scroll={checkLoadAdditionalData}
>
  {#if display}
    <table bind:this={domTable}>
      <thead>
        {#each _.range(display.columnLevelCount) as columnLevel}
          <tr>
            {#each display.columns as column}
              <PerspectiveHeaderControl {column} {columnLevel} {setConfig} {config} />
            {/each}
          </tr>
        {/each}
        <!-- <tr>
          {#each display.columns as column}
            <th class="filter">
              <DataFilterControl
                filter={column.dataNode.getFilter()}
                setFilter={value => column.dataNode.setFilter(value)}
                columnName={column.dataNode.uniqueName}
                filterBehaviour={column.dataNode.filterBehaviour}
              />
            </th>
          {/each}
        </tr> -->
      </thead>
      <tbody>
        {#each display.rows as row, rowIndex}
          <tr data-rowIndex={rowIndex}>
            {#each display.columns as column}
              {#if !row.rowCellSkips[column.columnIndex]}
                <PerspectiveCell
                  columnIndex={column.columnIndex}
                  value={row.rowData[column.columnIndex]}
                  rowSpan={row.rowSpans[column.columnIndex]}
                  rowData={row.rowData}
                  displayType={column.displayType}
                />
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  {#if errorMessage}
    <ErrorInfo message={errorMessage} />

    <FormStyledButton
      value="Reset filter"
      on:click={() =>
        setConfig(
          cfg => ({
            ...cfg,
            filters: {},
            parentFilters: [],
          }),
          true
        )}
    />
  {/if}

  {#if isLoading}
    <div class="loader">
      <PerspectiveLoadingIndicator />
    </div>
  {/if}
</div>

{#if rowCount != null}
  <StatusBarTabItem text={`${root?.namedObject?.pureName} rows: ${rowCount.toLocaleString()}`} />
{/if}

<style>
  .wrapper {
    overflow: scroll;
    flex: 1;
  }

  table {
    /* position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0; */
    overflow: scroll;
    /* border-collapse: collapse; */
    outline: none;

    border-collapse: separate; /* Don't collapse */
    border-spacing: 0;
  }

  table thead {
    position: sticky;
    top: 0;
    z-index: 100;
  }

  /* th.filter {
    padding: 0;
  } */

  thead :global(tr:first-child) :global(th) {
    border-top: 1px solid var(--theme-border);
  }

  /* 
  table {
    border: 1px solid;
    border-collapse: collapse;
  }

  td,
  th {
    border: 1px solid;
  } */

  .loader {
    position: absolute;
    right: 0;
    bottom: 0;
  }
</style>
