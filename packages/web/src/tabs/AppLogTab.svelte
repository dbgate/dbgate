<script lang="ts" context="module">
  export const matchingProps = [];
</script>

<script lang="ts">
  import _ from 'lodash';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import { format, startOfDay, endOfDay } from 'date-fns';
  import { getIntSettingsValue } from '../settings/settingsTools';
  import DateRangeSelector from '../elements/DateRangeSelector.svelte';
  import Chip from '../elements/Chip.svelte';
  import TabControl from '../elements/TabControl.svelte';
  import Link from '../elements/Link.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import { onDestroy, onMount, tick } from 'svelte';
  import DropDownButton from '../buttons/DropDownButton.svelte';
  import { showModal } from '../modals/modalTools';
  import ValueLookupModal from '../modals/ValueLookupModal.svelte';
  import { createLogCompoudCondition } from 'dbgate-sqltree';
  import { exportQuickExportFile } from '../utility/exportFileTools';
  import ToolStripExportButton, {
    createQuickExportHandlerRef,
    registerQuickExportHandler,
  } from '../buttons/ToolStripExportButton.svelte';

  let loadedRows = [];
  let loadedAll = false;
  let domLoadNext;
  let observer;
  let dateFilter = [new Date(), new Date()];
  let selectedLogIndex = null;
  let filters = {};
  let mode = 'recent';
  let autoScroll = true;
  let domTable;
  let jslid;

  const quickExportHandlerRef = createQuickExportHandlerRef();

  function formatPossibleUuid(value) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (_.isString(value) && value.match(uuidRegex)) {
      return value.slice(0, 8);
    }
    if (value == null) {
      return 'N/A';
    }
    return value;
  }

  async function loadNextRows() {
    const pageSize = getIntSettingsValue('dataGrid.pageSize', 100, 5, 1000);
    const rows = await apiCall('jsldata/get-rows', {
      jslid,
      offset: loadedRows.length,
      limit: pageSize,
      filters: createLogCompoudCondition(
        filters,
        'time',
        startOfDay(dateFilter[0]).getTime(),
        endOfDay(dateFilter[1]).getTime()
      ),
    });
    loadedRows = [...loadedRows, ...rows];
    if (rows.length < 10) {
      loadedAll = true;
    }
  }

  function startObserver(dom) {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (dom) {
      observer = new IntersectionObserver(entries => {
        if (entries.find(x => x.isIntersecting)) {
          loadNextRows();
        }
      });
      observer.observe(dom);
    }
  }

  $: if (mode == 'date') {
    startObserver(domLoadNext);
  }

  async function reloadData(createNewJslId = true) {
    switch (mode) {
      case 'recent':
        loadedRows = await apiCall('files/get-recent-app-log', { limit: 100 });
        await tick();
        scrollToRecent();
        break;
      case 'date':
        if (createNewJslId) {
          const resp = await apiCall('files/fill-app-logs', {
            dateFrom: startOfDay(dateFilter[0]).getTime(),
            dateTo: endOfDay(dateFilter[1]).getTime(),
          });
          jslid = resp.jslid;
        }
        loadedRows = [];
        loadedAll = false;
        break;
    }
  }

  function doSetFilter(field, values) {
    filters = {
      ...filters,
      [field]: values,
    };
    reloadData(false);
  }

  const ColumnNamesMap = {
    msgcode: 'Code',
  };

  function handleLogMessage(msg) {
    // console.log('AppLogTab: handleLogMessage', msg);
    if (mode !== 'recent') return;
    if (loadedRows.find(x => x.counter == msg.counter)) {
      return; // Already loaded
    }
    loadedRows = [...loadedRows, msg];
    scrollToRecent();
  }

  function scrollToRecent() {
    if (autoScroll && domTable) {
      domTable.scrollTop = domTable.scrollHeight;
    }
  }

  function filterBy(field) {
    showModal(ValueLookupModal, {
      jslid,
      field,
      multiselect: true,
      onConfirm: values => {
        doSetFilter(field, values);
      },
    });
  }

  onMount(() => {
    apiOn('applog-event', handleLogMessage);
    reloadData();
  });
  onDestroy(() => {
    apiOff('applog-event', handleLogMessage);
  });

  const quickExportHandler = fmt => async () => {
    const resp =
      mode == 'recent'
        ? await apiCall('files/fill-app-logs', {
            dateFrom: startOfDay(new Date()).getTime(),
            dateTo: endOfDay(new Date()).getTime(),
            prepareForExport: true,
          })
        : await apiCall('files/fill-app-logs', {
            dateFrom: startOfDay(dateFilter[0]).getTime(),
            dateTo: endOfDay(dateFilter[1]).getTime(),
            prepareForExport: true,
          });

    exportQuickExportFile(
      'Log',
      {
        functionName: 'jslDataReader',
        props: {
          jslid: resp.jslid,
        },
      },
      fmt
    );
  };
  registerQuickExportHandler(quickExportHandler);
</script>

<ToolStripContainer>
  <div class="wrapper classicform">
    <div class="filters">
      <div class="filter-label">Mode:</div>
      <SelectField
        isNative
        options={[
          { label: 'Recent logs', value: 'recent' },
          { label: 'Choose date', value: 'date' },
        ]}
        value={mode}
        on:change={e => {
          mode = e.detail;
          reloadData();
        }}
      />

      {#if mode === 'recent'}
        <div class="filter-label ml-2">Auto-scroll</div>
        <input
          type="checkbox"
          checked={autoScroll}
          on:change={e => {
            autoScroll = e.target['checked'];
          }}
        />
      {/if}

      {#if mode === 'date'}
        <div class="filter-label">Date:</div>
        <DateRangeSelector
          onChange={value => {
            dateFilter = value;
            reloadData();
          }}
        />
        <div class="ml-2">
          <DropDownButton
            data-testid="AdminAuditLogTab_addFilter"
            icon="icon filter"
            menu={[
              { text: 'Connection ID', onClick: () => filterBy('conid') },
              { text: 'Database', onClick: () => filterBy('database') },
              { text: 'Engine', onClick: () => filterBy('engine') },
              { text: 'Message code', onClick: () => filterBy('msgcode') },
              { text: 'Caller', onClick: () => filterBy('caller') },
              { text: 'Name', onClick: () => filterBy('name') },
            ]}
          />
        </div>

        {#each Object.keys(filters) as filterKey}
          <div class="ml-2">
            <span class="filter-label">{ColumnNamesMap[filterKey] || filterKey}:</span>
            {#each filters[filterKey] as value}
              <Chip
                onClose={() => {
                  filters = { ...filters, [filterKey]: filters[filterKey].filter(x => x !== value) };
                  if (!filters[filterKey].length) {
                    filters = _.omit(filters, filterKey);
                  }
                  reloadData(false);
                }}
              >
                {formatPossibleUuid(value)}
              </Chip>
            {/each}
          </div>
        {/each}
      {/if}
    </div>
    <div class="tablewrap" bind:this={domTable}>
      <table>
        <thead>
          <tr>
            <th style="width:80px">Date</th>
            <th>Time</th>
            <th>Code</th>
            <th>Message</th>
            <th>Connection</th>
            <th>Database</th>
            <th>Engine</th>
            <th>Caller</th>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {#each loadedRows as row, index}
            <tr
              class="clickable"
              on:click={() => {
                if (selectedLogIndex === index) {
                  selectedLogIndex = null;
                } else {
                  selectedLogIndex = index;
                }
              }}
            >
              <td>{format(new Date(parseInt(row.time)), 'yyyy-MM-dd')}</td>
              <td>{format(new Date(parseInt(row.time)), 'HH:mm:ss')}</td>
              <td>{row.msgcode || ''}</td>
              <td>{row.msg}</td>
              <td>{formatPossibleUuid(row.conid) || ''}</td>
              <td>{row.database || ''}</td>
              <td>{row.engine?.includes('@') ? row.engine.split('@')[0] : row.engine || ''}</td>
              <td>{row.caller || ''}</td>
              <td>{row.name || ''}</td>
            </tr>

            {#if index === selectedLogIndex}
              <tr>
                <td colspan="9">
                  <TabControl
                    isInline
                    tabs={_.compact([
                      { label: 'Details', slot: 1 },
                      { label: 'JSON', slot: 2 },
                    ])}
                  >
                    <svelte:fragment slot="1">
                      <div class="details-wrap">
                        <div class="row">
                          <div>Message code:</div>
                          {#if mode == 'date'}
                            <Link onClick={() => doSetFilter('msgcode', [row.msgcode])}>{row.msgcode || 'N/A'}</Link>
                          {:else}
                            {row.msgcode || 'N/A'}
                          {/if}
                        </div>
                        <div class="row">
                          <div>Message:</div>
                          {row.msg}
                        </div>
                        <div class="row">
                          <div>Time:</div>
                          <b>{format(new Date(parseInt(row.time)), 'yyyy-MM-dd HH:mm:ss')}</b>
                        </div>
                        <div class="row">
                          <div>Caller:</div>
                          {#if mode == 'date'}
                            <Link onClick={() => doSetFilter('caller', [row.caller])}>{row.caller || 'N/A'}</Link>
                          {:else}
                            {row.caller || 'N/A'}
                          {/if}
                        </div>
                        <div class="row">
                          <div>Name:</div>
                          {#if mode == 'date'}
                            <Link onClick={() => doSetFilter('name', [row.name])}>{row.name || 'N/A'}</Link>
                          {:else}
                            {row.name || 'N/A'}
                          {/if}
                        </div>
                        {#if row.conid}
                          <div class="row">
                            <div>Connection ID:</div>
                            {#if mode == 'date'}
                              <Link onClick={() => doSetFilter('conid', [row.conid])}
                                >{formatPossibleUuid(row.conid)}</Link
                              >
                            {:else}
                              {formatPossibleUuid(row.conid)}
                            {/if}
                          </div>
                        {/if}
                        {#if row.database}
                          <div class="row">
                            <div>Database:</div>
                            {#if mode == 'date'}
                              <Link onClick={() => doSetFilter('database', [row.database])}>{row.database}</Link>
                            {:else}
                              {row.database}
                            {/if}
                          </div>
                        {/if}
                        {#if row.engine}
                          <div class="row">
                            <div>Engine:</div>
                            {#if mode == 'date'}
                              <Link onClick={() => doSetFilter('engine', [row.engine])}>{row.engine}</Link>
                            {:else}
                              {row.engine}
                            {/if}
                          </div>
                        {/if}
                      </div></svelte:fragment
                    >
                    <svelte:fragment slot="2">
                      <pre>{JSON.stringify(row, null, 2)}</pre>
                    </svelte:fragment>
                  </TabControl>
                </td>
              </tr>
            {/if}
          {/each}
          {#if !loadedRows?.length && mode === 'date'}
            <tr>
              <td colspan="6">No data for selected date</td>
            </tr>
          {/if}
          {#if !loadedAll && mode === 'date'}
            {#key loadedRows}
              <tr>
                <td colspan="6" bind:this={domLoadNext}>Loading next rows... </td>
              </tr>
            {/key}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <svelte:fragment slot="toolstrip">
    <ToolStripButton
      icon="icon refresh"
      data-testid="AdminAuditLogTab_refreshButton"
      on:click={() => {
        reloadData();
      }}>Refresh</ToolStripButton
    >
    <ToolStripExportButton {quickExportHandlerRef} />
  </svelte:fragment>
</ToolStripContainer>

<style>
  .editor-wrap {
    height: 200px;
  }
  .tablewrap {
    overflow: auto;
    flex: 1;
  }
  .wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  table.disableFocusOutline:focus {
    outline: none;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  table.selectable {
    user-select: none;
  }
  tbody tr {
    background: var(--theme-bg-0);
  }
  tbody tr.selected {
    background: var(--theme-bg-3);
  }
  table:focus tbody tr.selected {
    background: var(--theme-bg-selected);
  }
  tbody tr.clickable:hover {
    background: var(--theme-bg-hover);
  }

  thead th {
    border: 1px solid var(--theme-border);
    background-color: var(--theme-bg-1);
    padding: 5px;
  }
  tbody td {
    border: 1px solid var(--theme-border);
  }
  tbody td {
    padding: 5px;
  }
  td.isHighlighted {
    background-color: var(--theme-bg-1);
  }

  td.clickable {
    cursor: pointer;
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
    border-top: 1px solid var(--theme-border);
  }

  table th {
    border-left: none;
  }

  thead :global(tr:first-child) :global(th) {
    border-top: 1px solid var(--theme-border);
  }

  table td {
    border: 0px;
    border-bottom: 1px solid var(--theme-border);
    border-right: 1px solid var(--theme-border);
  }

  table {
    border-spacing: 0;
    border-collapse: separate;
    border-left: 1px solid var(--theme-border);
  }

  .empty-cell {
    background-color: var(--theme-bg-1);
  }

  .filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  .filter-label {
    margin-right: 5px;
    color: var(--theme-font-2);
  }

  .details-wrap {
    padding: 10px;
    display: flex;
    flex-direction: column;
  }

  .details-wrap .row {
    display: flex;
  }

  .details-wrap .row div:first-child {
    width: 150px;
  }

  pre {
    overflow: auto;
    max-width: 50vw;
  }
</style>
