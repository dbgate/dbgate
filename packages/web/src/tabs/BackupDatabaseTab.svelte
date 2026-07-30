<script lang="ts" context="module">
  import { findEngineDriver, getConnectionLabel, getEngineLabel } from 'dbgate-tools';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import { apiCall, apiOff, apiOn } from '../utility/api';

  import { getActiveComponent } from '../utility/createActivator';
  import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';

  const getCurrentEditor = () => getActiveComponent('BackupDatabaseTab');
</script>

<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import { format as dateFormat } from 'date-fns';
  import getElectron from '../utility/getElectron';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import useEffect from '../utility/useEffect';
  import { copyTextToClipboard } from '../utility/clipboard';
  import WidgetTitle from '../widgets/WidgetTitle.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import WidgetsInnerContainer from '../widgets/WidgetsInnerContainer.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as databaseObjectAppObject from '../appobj/DatabaseObjectAppObject.svelte';
  import { getObjectTypeFieldLabel } from '../utility/common';
  import _ from 'lodash';
  import { writable } from 'svelte/store';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import uuidv1 from 'uuid/v1';
  import { downloadFromApi } from '../utility/exportFileTools';
  import openNewTab from '../utility/openNewTab';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { extensions } from '../stores';
  import FormArgument from '../forms/FormArgument.svelte';
  import FormArgumentList from '../forms/FormArgumentList.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import { _t } from '../translations';
  import { isProApp } from '../utility/proTools';
  import { showSnackbarError } from '../utility/snackbar';

  let busy = false;
  let isDownloading = false;
  let backupCancelled = false;

  let outputFile;
  let outputFilePath;

  let runnerId = null;
  let executeNumber = 0;

  let objectsFilter = '';
  let objectsWidth = 0;

  export let conid;
  export let database;

  const electron = getElectron();
  const isPremium = isProApp();

  const connection = useConnectionInfo({ conid });

  $: driver = findEngineDriver($connection, $extensions);

  $: dbinfo = useDatabaseInfo({ conid, database });

  const checkedObjectsStore = writable([]);

  $: objectList = $dbinfo?.tables ?? [];

  $: if ($dbinfo?.tables?.length > 0) {
    checkedObjectsStore.update(x => (x?.length > 0 ? x : $dbinfo.tables));
  }

  function generateOutputFileName() {
    return `${database}-${dateFormat(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.sql`;
  }

  async function generateOutputFilePath(file = null) {
    if (!file) file = generateOutputFileName();
    const resp = await apiCall('files/get-file-real-path', { folder: 'sql', file });
    return resp;
  }

  function getBackupParams() {
    const selectedTables = isPremium
      ? ($checkedObjectsStore ?? []).map(x => _.pick(x, ['pureName', 'schemaName']))
      : [];
    const selectedTableKeys = new Set(selectedTables.map(x => `${x.schemaName}||${x.pureName}`));
    const skippedTables = isPremium
      ? ($dbinfo?.tables ?? [])
          .filter(x => !selectedTableKeys.has(`${x.schemaName}||${x.pureName}`))
          .map(x => _.pick(x, ['pureName', 'schemaName']))
      : [];
    return {
      conid,
      database,
      options: isPremium ? $valuesStore : { backupTool: 'dbgate-pg-dumper' },
      selectedTables,
      skippedTables,
    };
  }

  async function handleExecute() {
    busy = true;
    backupCancelled = false;

    try {
      outputFile = generateOutputFileName();
      outputFilePath = await generateOutputFilePath(outputFile);
      if (!outputFilePath) {
        busy = false;
        showSnackbarError('Could not resolve the backup output path');
        return;
      }
      if (outputFilePath?.errorMessage) {
        busy = false;
        return;
      }

      runnerId = uuidv1();
      executeNumber += 1;

      const resp = await apiCall('database-connections/native-backup', {
        ...getBackupParams(),
        outputFile: outputFilePath,
        runid: runnerId,
      });
      if (resp?.errorMessage) {
        busy = false;
      }
    } catch (error) {
      busy = false;
      showSnackbarError(error.message);
    }
  }

  async function handleCancel() {
    await apiCall('runners/cancel', { runid: runnerId });
    backupCancelled = true;
  }

  async function handleGenerateCommand() {
    const resp = await apiCall('database-connections/native-backup-command', {
      ...getBackupParams(),
      outputFile: await generateOutputFilePath(),
    });
    copyTextToClipboard(resp.commandLine);
  }

  $: effectRunner = useEffect(() => registerRunnerDone(runnerId));

  function registerRunnerDone(rid) {
    if (rid) {
      apiOn(`runner-done-${rid}`, handleRunnerDone);
      return () => {
        apiOff(`runner-done-${rid}`, handleRunnerDone);
      };
    } else {
      return () => {};
    }
  }

  $: $effectRunner;

  const handleRunnerDone = () => {
    busy = false;
  };

  $: formArgs = (driver?.getNativeOperationFormArgs ? driver?.getNativeOperationFormArgs('backup') : null) ?? [];
  $: backupToolFormArgs = formArgs.filter(arg => ['backupTool', 'targetPostgresVersion'].includes(arg.name));
  $: otherFormArgs = formArgs.filter(arg => !['backupTool', 'targetPostgresVersion'].includes(arg.name));

  const valuesStore = writable({});
</script>

<ToolStripContainer>
  <VerticalSplitter initialValue={isPremium ? '~220px' : '200px'}>
    <svelte:fragment slot="1">
      <HorizontalSplitter
        isSplitter={isPremium}
        initialValue="65%"
        onChangeSize={(_leftSize, rightSize) => {
          if (isPremium) objectsWidth = rightSize;
        }}
      >
        <svelte:fragment slot="1">
          <div class="content">
            <div class="source">
              <div class="labelw">
                <FontIcon icon="icon import" />
                {_t('backupDatabase.source', { defaultMessage: 'Source:' })}
              </div>
              <div>
                <FontIcon icon="icon server" />
                {getConnectionLabel($connection)}
                <FontIcon icon="icon database" />
                {database}
              </div>
              <div class="engine">
                {getEngineLabel($connection)}
              </div>
            </div>
            <div class="target">
              <div class="labelw">
                <FontIcon icon="icon export" />
                {_t('backupDatabase.target', { defaultMessage: 'Target:' })}
              </div>
              <div>
                {#if busy}
                  {_t('backupDatabase.generatingFile', {
                    defaultMessage: 'Generating file {outputFile}',
                    values: { outputFile },
                  })}
                {:else if outputFile}
                  <div>{outputFile}</div>
                  {#if electron}
                    <FormStyledButton
                      on:click={() => {
                        electron.showItemInFolder(outputFilePath);
                      }}
                      value={_t('common.browse', { defaultMessage: 'Browse' })}
                    />
                    <FormStyledButton
                      on:click={async () => {
                        const file = await electron.showSaveDialog({});
                        if (file) {
                          const fs = window.require('fs');
                          fs.copyFile(outputFilePath, file, () => {});
                        }
                      }}
                      value={_t('common.save', { defaultMessage: 'Save' })}
                    />
                  {:else}
                    {#if isDownloading}
                      <LoadingInfo
                        message={_t('backupDatabase.preparingDownload', { defaultMessage: 'Preparing download...' })}
                      />
                    {/if}
                    <FormStyledButton
                      disabled={isDownloading}
                      on:click={async () => {
                        isDownloading = true;
                        try {
                          await downloadFromApi(`files/data/sql/${outputFile}`, outputFile);
                        } finally {
                          isDownloading = false;
                        }
                      }}
                      value={isDownloading
                        ? _t('backupDatabase.preparing', { defaultMessage: 'Preparing...' })
                        : _t('common.download', { defaultMessage: 'Download' })}
                    />
                  {/if}
                  <FormStyledButton
                    on:click={async () => {
                      const resp = await apiCall('files/load', { folder: 'sql', file: outputFile, format: 'text' });

                      const connProps = {};
                      let tooltip = undefined;

                      openNewTab(
                        {
                          title: outputFile,
                          icon: 'img sql-file',
                          tabComponent: 'QueryTab',
                          props: {
                            savedFile: outputFile,
                            savedFolder: 'sql',
                            savedFormat: 'text',
                            ...connProps,
                          },
                        },
                        { editor: resp }
                      );
                    }}
                    value={_t('backupDatabase.openInTab', { defaultMessage: 'Open in tab' })}
                  />
                  {#if backupCancelled}
                    <div class="backup-cancelled">
                      {_t('backupDatabase.cancelled', { defaultMessage: 'Backup cancelled' })}
                    </div>
                  {/if}
                {:else}
                  {_t('backupDatabase.sqlFilesHint', {
                    defaultMessage: 'SQL Files folder. Run backup to create the output file.',
                  })}
                {/if}
              </div>
            </div>
            {#if isPremium}
              <div class="backup-options">
                <div class="heading">{_t('backupDatabase.backupOptions', { defaultMessage: 'Backup options' })}</div>
                <FormProviderCore values={valuesStore}>
                  <div class="backup-tool-options">
                    {#each backupToolFormArgs as arg (arg.name)}
                      <FormArgument {arg} namePrefix="" />
                    {/each}
                  </div>
                  <FormArgumentList args={otherFormArgs} />
                </FormProviderCore>
              </div>
            {/if}
          </div>
        </svelte:fragment>

        <svelte:fragment slot="2">
          {#if isPremium}
            <div class="flexcol flex1">
              <WidgetTitle>{_t('backupDatabase.chooseTables', { defaultMessage: 'Choose tables' })}</WidgetTitle>
              <SearchBoxWrapper filter={objectsFilter}>
                <SearchInput
                  placeholder={_t('backupDatabase.searchTablesOrObjects', {
                    defaultMessage: 'Search tables or objects',
                  })}
                  bind:value={objectsFilter}
                />
              </SearchBoxWrapper>

              <WidgetsInnerContainer fixedWidth={objectsWidth}>
                <AppObjectList
                  list={objectList.map(x => ({ ...x, conid, database }))}
                  module={databaseObjectAppObject}
                  groupFunc={data => getObjectTypeFieldLabel(data.objectTypeField)}
                  filter={objectsFilter}
                  disableContextMenu
                  {checkedObjectsStore}
                  passProps={{ ingorePin: true }}
                />
              </WidgetsInnerContainer>
            </div>
          {/if}
        </svelte:fragment>
      </HorizontalSplitter>
    </svelte:fragment>

    <svelte:fragment slot="2">
      <WidgetColumnBar>
        <WidgetColumnBarItem title={_t('common.messages', { defaultMessage: 'Messages' })} name="messages">
          <SocketMessageView
            eventName={runnerId ? `runner-info-${runnerId}` : null}
            {executeNumber}
            showNoMessagesAlert
            showCaller
          />
        </WidgetColumnBarItem>
      </WidgetColumnBar>
    </svelte:fragment>
  </VerticalSplitter>

  <svelte:fragment slot="toolstrip">
    {#if busy}
      <ToolStripButton icon="icon stop" on:click={handleCancel} data-testid="BackupDatabaseTab_stopButton"
        >{_t('common.stop', { defaultMessage: 'Stop' })}</ToolStripButton
      >
    {:else}
      <ToolStripButton on:click={handleExecute} icon="icon run" data-testid="BackupDatabaseTab_executeButton"
        >{_t('common.run', { defaultMessage: 'Run' })}</ToolStripButton
      >
    {/if}
    {#if isPremium && $valuesStore.backupTool != 'dbgate-pg-dumper'}
      <ToolStripButton icon="img shell" on:click={handleGenerateCommand} data-testid="BackupDatabaseTab_generateCommand"
        >{_t('backupDatabase.copyCommandLine', { defaultMessage: 'Copy command line' })}</ToolStripButton
      >
    {/if}
  </svelte:fragment>

  {#if busy}
    <LoadingInfo wrapper message={_t('backupDatabase.exportingSqlDump', { defaultMessage: 'Exporting SQL dump' })} />
  {/if}
</ToolStripContainer>

<style>
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: var(--theme-content-background);
  }

  .source,
  .target {
    margin: 10px;
    padding: 10px;
    font-size: 15px;
    border: var(--theme-card-border);
    display: flex;
  }

  .source {
    margin-bottom: 0px;
  }

  .target {
    margin-top: 0px;
  }

  .labelw {
    width: 8em;
  }

  .engine {
    color: var(--theme-generic-font-grayed);
    margin-left: 10px;
  }

  .backup-options {
    margin: 10px;
  }

  .heading {
    font-size: 20px;
    margin-bottom: 4px;
  }

  .backup-tool-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 6px;
  }

  .backup-cancelled {
    margin-top: 8px;
    color: var(--theme-generic-font-grayed);
  }
</style>
