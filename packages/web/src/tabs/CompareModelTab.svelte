<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('CompareModelTab');

  registerCommand({
    id: 'compareModels.reportDiff',
    category: 'Compare models',
    toolbarName: 'Report',
    name: 'Report diff',
    icon: 'icon report',
    toolbar: true,
    isRelatedToTab: true,
    onClick: () => getCurrentEditor().showReport(),
    testEnabled: () => getCurrentEditor() != null,
  });

  registerCommand({
    id: 'compareModels.swap',
    category: 'Compare models',
    toolbarName: 'Swap',
    name: 'Swap source & target',
    icon: 'icon swap',
    toolbar: true,
    isRelatedToTab: true,
    onClick: () => getCurrentEditor().swap(),
    testEnabled: () => getCurrentEditor() != null,
  });

  registerCommand({
    id: 'compareModels.deploy',
    category: 'Compare models',
    toolbarName: 'Deploy',
    name: 'Deploy',
    icon: 'icon deploy',
    group: 'save',
    toolbar: true,
    isRelatedToTab: true,
    onClick: () => getCurrentEditor().deploy(),
    testEnabled: () => getCurrentEditor() != null,
  });

  registerCommand({
    id: 'compareModels.refresh',
    category: 'Compare models',
    toolbarName: 'Refresh',
    name: 'Refresh models',
    icon: 'icon reload',
    toolbar: true,
    isRelatedToTab: true,
    onClick: () => getCurrentEditor().refreshModels(),
    testEnabled: () => getCurrentEditor() != null,
  });

  function stateOrder(state) {
    switch (state) {
      case 'added':
        return 1;
      case 'changed':
        return 2;
      case 'removed':
        return 3;
      case 'equal':
        return 4;
    }
    return 5;
  }

  function getAlterObjectScript(objectTypeField, oldObject, newObject, opts, db, driver) {
    if ((!oldObject && !newObject) || !driver) {
      return { sql: '' };
    }

    if (objectTypeField == 'tables') {
      return getAlterTableScript(oldObject, newObject, opts, db, db, driver);
    }
    const dmp = driver.createDumper();
    if (oldObject) dmp.dropSqlObject(oldObject);
    if (newObject) dmp.createSqlObject(newObject);
    return { sql: dmp.s };
  }

  function filterDiffRowsByFlag(rows, values, skip = null) {
    let res = rows;

    if (skip != 'added') {
      res = res.filter(row => !values?.hideAdded || row.state != 'added');
    }
    if (skip != 'removed') {
      res = res.filter(row => !values?.hideRemoved || row.state != 'removed');
    }
    if (skip != 'changed') {
      res = res.filter(row => !values?.hideChanged || row.state != 'changed');
    }
    if (skip != 'equal') {
      res = res.filter(row => !values?.hideEqual || row.state != 'equal');
    }

    for (const objectTypeField of _.keys(DbDiffCompareDefs)) {
      if (skip == objectTypeField) {
        continue;
      }
      if (values && values[`hide_${objectTypeField}`]) {
        res = res.filter(row => row.objectTypeField != objectTypeField);
      }
    }

    return res;
  }

  function filterDiffRows(rows, values, filter) {
    let res = rows.filter(row => filterName(filter, row.sourcePureName, row.targetPureName));

    res = filterDiffRowsByFlag(rows, values);

    return res;
  }
</script>

<script lang="ts">
  import {
    findEngineDriver,
    generateDbPairingId,
    getAlterTableScript,
    matchPairedObjects,
    computeDbDiffRows,
    computeTableDiffColumns,
    getCreateObjectScript,
    modelCompareDbDiffOptions,
    filterName,
    DbDiffCompareDefs,
    getAlterDatabaseScript,
    DatabaseAnalyser,
  } from 'dbgate-tools';

  import _, { startsWith } from 'lodash';
  import { derived, writable } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';
  import DiffView from '../elements/DiffView.svelte';
  import InlineButton from '../elements/InlineButton.svelte';
  import ScrollableTableControl from '../elements/ScrollableTableControl.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import TabControl from '../elements/TabControl.svelte';
  import TableControl from '../elements/TableControl.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import FormFieldTemplateTiny from '../forms/FormFieldTemplateTiny.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import RowsFilterSwitcher from '../forms/RowsFilterSwitcher.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import FormConnectionSelect from '../impexp/FormConnectionSelect.svelte';
  import FormDatabaseSelect from '../impexp/FormDatabaseSelect.svelte';
  import ConfirmSqlModal from '../modals/ConfirmSqlModal.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { showModal } from '../modals/modalTools';
  import SqlEditor from '../query/SqlEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import { extensions } from '../stores';
  import { apiCall } from '../utility/api';
  import { changeTab } from '../utility/common';
  import contextMenu, { getContextMenu, registerMenu } from '../utility/contextMenu';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { saveFileToDisk } from '../utility/exportElectronFile';
  import { useArchiveFolders, useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import resolveApi from '../utility/resolveApi';
  import { showSnackbarSuccess } from '../utility/snackbar';

  export let tabid;

  let pairIndex = 0;
  let filter = '';

  export const activator = createActivator('CompareModelTab', true);

  $: dbDiffOptions = $values?.sourceConid == '__model' ? modelCompareDbDiffOptions : {};

  $: sourceDbValue = useDatabaseInfo({ conid: $values?.sourceConid, database: $values?.sourceDatabase });
  $: targetDbValue = useDatabaseInfo({ conid: $values?.targetConid, database: $values?.targetDatabase });

  // $: console.log('$sourceDbValue', $sourceDbValue);
  // $: console.log('$targetDbValue', $targetDbValue);

  $: sourceDb = generateDbPairingId($sourceDbValue);
  $: targetDb = generateDbPairingId($targetDbValue);

  $: connection = useConnectionInfo({ conid: $values?.targetConid });
  $: driver = findEngineDriver($connection, $extensions);

  // $: console.log('sourceDb', sourceDb);
  // $: console.log('targetDb', targetDb);
  // $: console.log('$connection', $connection);
  // $: console.log('$extensions', $extensions);
  // $: console.log('driver', driver);

  $: targetDbPaired = matchPairedObjects(sourceDb, targetDb, dbDiffOptions);
  $: diffRowsAll = _.sortBy(computeDbDiffRows(sourceDb, targetDbPaired, dbDiffOptions, driver), x =>
    stateOrder(x.state)
  );

  // $: console.log('diffRowsAll', diffRowsAll);

  $: diffRows = filterDiffRows(diffRowsAll, $values, filter);
  $: diffColumns = computeTableDiffColumns(
    diffRows[pairIndex]?.source,
    diffRows[pairIndex]?.target,
    dbDiffOptions,
    driver
  );

  $: sqlPreview = getAlterObjectScript(
    diffRows[pairIndex]?.objectTypeField,
    diffRows[pairIndex]?.target,
    diffRows[pairIndex]?.source,
    dbDiffOptions,
    targetDb,
    driver
  ).sql;

  $: archiveFolders = useArchiveFolders();

  $: changeTab(tabid, tab => ({
    ...tab,
    title: `${$values?.sourceDatabase || '???'}=>${$values?.targetDatabase || '???'}`,
    props: {
      ...tab.props,
      conid: $values?.targetConid,
      database: $values?.targetDatabase,
    },
  }));

  export async function showReport() {
    saveFileToDisk(async filePath => {
      await apiCall('database-connections/generate-db-diff-report', {
        filePath,
        sourceConid: $values?.sourceConid,
        sourceDatabase: $values?.sourceDatabase,
        targetConid: $values?.targetConid,
        targetDatabase: $values?.targetDatabase,
      });
    });
  }

  export function swap() {
    $values = {
      ...$values,
      sourceConid: $values?.targetConid,
      sourceDatabase: $values?.targetDatabase,
      targetConid: $values?.sourceConid,
      targetDatabase: $values?.sourceDatabase,
    };
  }

  function handleCheckAll() {
    const isAnyChecked = diffRows.some(row => $values[`isChecked_${row.identifier}`]);
    if (isAnyChecked) {
      $values = _.omitBy($values, (v, k) => k.startsWith('isChecked_'));
    } else {
      $values = {
        ...$values,
        ..._.fromPairs(diffRows.filter(row => row.state != 'equal').map(row => [`isChecked_${row.identifier}`, true])),
      };
    }
  }

  export function refreshModels() {
    apiCall('database-connections/sync-model', {
      conid: $values?.targetConid,
      database: $values?.targetDatabase,
    });
    apiCall('database-connections/sync-model', {
      conid: $values?.sourceConid,
      database: $values?.sourceDatabase,
    });
  }

  async function handleConfirmSql(sql) {
    const conid = $values?.targetConid;
    const database = $values?.targetDatabase;

    const resp = await apiCall('database-connections/run-script', { conid, database, sql });
    const { errorMessage } = resp.data || {};
    if (errorMessage) {
      showModal(ErrorMessageModal, { title: 'Error when saving', message: errorMessage });
    } else {
      $values = _.omitBy($values, (v, k) => k.startsWith('isChecked_'));
      await apiCall('database-connections/sync-model', { conid, database });
      showSnackbarSuccess('Saved to database');
    }
  }

  function getDeploySql() {
    const leftDb = DatabaseAnalyser.createEmptyStructure();
    const rightDb = DatabaseAnalyser.createEmptyStructure();

    for (const diffRow of diffRows.filter(row => $values[`isChecked_${row.identifier}`])) {
      if (diffRow.source) leftDb[diffRow.objectTypeField].push(diffRow.source);
      if (diffRow.target) rightDb[diffRow.objectTypeField].push(diffRow.target);
    }

    return getAlterDatabaseScript(rightDb, leftDb, dbDiffOptions, targetDb, sourceDb, driver).sql;
    // getAlterDatabaseScript();
    // return diffRows
    //   .filter(row => $values[`isChecked_${row.identifier}`])
    //   .map(row => getAlterTableScript(row?.target, row?.source, dbDiffOptions, sourceDb, targetDb, driver).sql)
    //   .join('\n');
  }

  export function deploy() {
    const sql = getDeploySql();
    showModal(ConfirmSqlModal, {
      sql,
      onConfirm: () => {
        handleConfirmSql(sql);
      },
      engine: driver.engine,
    });
  }

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
  });

  const values = {
    ...editorValue,
    update: setEditorData,
    set: setEditorData,
  };

  registerMenu(
    { command: 'compareModels.deploy' },
    { divider: true },
    { command: 'compareModels.refresh' },
    { command: 'compareModels.swap' },
    { divider: true },
    { command: 'compareModels.reportDiff' }
  );

  const menu = getContextMenu();
</script>

<div class="wrapper" use:contextMenu={menu}>
  <VerticalSplitter>
    <div slot="1" class="flexcol">
      <FormProviderCore {values}>
        <div class="topbar">
          <div class="col-3">
            <FormConnectionSelect
              name="sourceConid"
              label="Source server"
              templateProps={{ noMargin: true }}
              isNative
              allowChooseModel
              notSelected
            />
          </div>
          <div class="col-3">
            {#if $values?.sourceConid == '__model'}
              <FormSelectField
                name="sourceDatabase"
                label="Source DB model"
                templateProps={{ noMargin: true }}
                isNative
                options={($archiveFolders || []).map(x => ({ label: x.name, value: `archive:${x.name}` }))}
                notSelected
              />
            {:else}
              <FormDatabaseSelect
                conidName="sourceConid"
                name="sourceDatabase"
                label="Source database"
                templateProps={{ noMargin: true }}
                isNative
                notSelected
              />
            {/if}
          </div>
          <div class="deployButton">
            <InlineButton on:click={deploy}>
              <div class="arrow">
                <FontIcon icon="icon arrow-right-bold" />
              </div>
              Deploy (experimental)
            </InlineButton>
          </div>
          <div class="col-3">
            <FormConnectionSelect
              name="targetConid"
              label="Target server"
              templateProps={{ noMargin: true }}
              isNative
              notSelected
            />
          </div>
          <div class="col-3">
            <FormDatabaseSelect
              conidName="targetConid"
              name="targetDatabase"
              label="Target database"
              templateProps={{ noMargin: true }}
              isNative
              notSelected
            />
          </div>
        </div>
        <div class="filters">
          <SearchInput placeholder="Search tables or objects" bind:value={filter} />

          <RowsFilterSwitcher
            icon="img add"
            label="Added"
            {values}
            field="hideAdded"
            count={filterDiffRowsByFlag(
              diffRowsAll.filter(x => x.state == 'added'),
              $values,
              'added'
            ).length}
          />
          <RowsFilterSwitcher
            icon="img minus"
            label="Removed"
            {values}
            field="hideRemoved"
            count={filterDiffRowsByFlag(
              diffRowsAll.filter(x => x.state == 'removed'),
              $values,
              'removed'
            ).length}
          />
          <RowsFilterSwitcher
            icon="img changed"
            label="Changed"
            {values}
            field="hideChanged"
            count={filterDiffRowsByFlag(
              diffRowsAll.filter(x => x.state == 'changed'),
              $values,
              'changed'
            ).length}
          />
          <RowsFilterSwitcher
            icon="img equal"
            label="Equal"
            {values}
            field="hideEqual"
            count={filterDiffRowsByFlag(
              diffRowsAll.filter(x => x.state == 'equal'),
              $values,
              'equal'
            ).length}
          />

          {#each _.keys(DbDiffCompareDefs) as objectTypeField}
            <RowsFilterSwitcher
              icon={DbDiffCompareDefs[objectTypeField].icon}
              label={DbDiffCompareDefs[objectTypeField].plural}
              {values}
              field={'hide_' + objectTypeField}
              count={filterDiffRowsByFlag(
                diffRowsAll.filter(x => x.objectTypeField == objectTypeField),
                $values,
                objectTypeField
              ).length}
            />
          {/each}
        </div>
      </FormProviderCore>

      <div class="tableWrapper">
        <ScrollableTableControl
          rows={diffRows}
          bind:selectedIndex={pairIndex}
          selectable
          disableFocusOutline
          columns={[
            { fieldName: 'isChecked', header: '', width: '50px', slot: 1, headerSlot: 2 },
            { fieldName: 'type', header: 'Type', width: '100px', slot: 3 },
            { fieldName: 'sourceSchemaName', header: 'Schema' },
            { fieldName: 'sourcePureName', header: 'Name' },
            { fieldName: 'state', header: 'Action', width: '100px' },
            { fieldName: 'targetSchemaName', header: 'Schema' },
            { fieldName: 'targetPureName', header: 'Name' },
          ]}
        >
          <input
            type="checkbox"
            slot="1"
            let:row
            disabled={row.state == 'equal'}
            checked={!!$values[`isChecked_${row['identifier']}`]}
            on:change={e => {
              // @ts-ignore
              $values = { ...$values, [`isChecked_${row.identifier}`]: e.target.checked };
            }}
          />
          <svelte:fragment slot="2">
            <InlineButton on:click={handleCheckAll}>
              <FontIcon icon="icon check-all" />
            </InlineButton>
          </svelte:fragment>
          <svelte:fragment slot="3" let:row>
            <FontIcon icon={row.typeIcon} />
            {row.typeName}
          </svelte:fragment>
        </ScrollableTableControl>
      </div>
    </div>

    <svelte:fragment slot="2">
      <TabControl
        tabs={[
          {
            label: 'DDL',
            slot: 1,
          },
          {
            label: 'Synchronize script',
            slot: 2,
          },
          {
            label: 'Columns',
            slot: 3,
          },
        ]}
      >
        <svelte:fragment slot="1">
          <DiffView
            leftTitle={diffRows[pairIndex]?.target?.pureName}
            rightTitle={diffRows[pairIndex]?.source?.pureName}
            leftText={getCreateObjectScript(diffRows[pairIndex]?.target, driver)}
            rightText={getCreateObjectScript(diffRows[pairIndex]?.source, driver)}
          />
        </svelte:fragment>

        <svelte:fragment slot="2">
          <SqlEditor readOnly value={sqlPreview} />
        </svelte:fragment>

        <svelte:fragment slot="3">
          <ScrollableTableControl
            rows={diffColumns}
            disableFocusOutline
            columns={[
              { fieldName: 'sourceColumnName', header: 'Name', width: '100px' },
              { fieldName: 'sourceDataType', header: 'Type' },
              { fieldName: 'sourceNotNull', header: 'Not null', slot: 1 },
              { fieldName: 'state', header: 'Action', width: '100px' },
              { fieldName: 'targetColumnName', header: 'Schema' },
              { fieldName: 'targetDataType', header: 'Name' },
              { fieldName: 'targetNotNull', header: 'Not null', slot: 2 },
            ]}
          >
            <input type="checkbox" disabled slot="1" let:row checked={!!row.sourceNotNull} />
            <input type="checkbox" disabled slot="2" let:row checked={!!row.targetNotNull} />
          </ScrollableTableControl>
        </svelte:fragment>
      </TabControl>
    </svelte:fragment>
  </VerticalSplitter>
</div>

<style>
  .wrapper {
    overflow: auto;
    flex: 1;
  }

  .flexcol {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    display: flex;
    margin: 10px 0px;
    width: 100%;
  }
  .arrow {
    font-size: 30px;
    color: var(--theme-icon-blue);
    align-self: center;
    position: relative;
    /* top: 10px; */
  }

  .deployButton {
    margin-left: 20px;
    margin-right: 20px;
  }

  .tableWrapper {
    position: relative;
    width: 100%;
    flex: 1;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
  }
</style>
