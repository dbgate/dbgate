<script lang="ts" context="module">
  import { findEngineDriver, getConnectionLabel, getEngineLabel } from 'dbgate-tools';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import { apiCall, apiOff, apiOn } from '../utility/api';

  import { getActiveComponent } from '../utility/createActivator';
  import { useConnectionInfo, useDatabaseInfo, useFiles } from '../utility/metadataLoaders';

  const getCurrentEditor = () => getActiveComponent('RestoreDatabaseTab');
</script>

<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import getElectron from '../utility/getElectron';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import useEffect from '../utility/useEffect';
  import { copyTextToClipboard } from '../utility/clipboard';
  import _ from 'lodash';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import FormStyledButtonLikeLabel from '../buttons/FormStyledButtonLikeLabel.svelte';
  import resolveApi, { resolveApiHeaders } from '../utility/resolveApi';
  import { showSnackbarError } from '../utility/snackbar';
  import uuidv1 from 'uuid/v1';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { extensions } from '../stores';
  import { isProApp } from '../utility/proTools';
  import { onDestroy } from 'svelte';

  export let tabid;
  export let conid;
  export let database;

  let busy = false;
  let operationStatus = 'Not started';
  let sourceType = 'sqlFilesFolder';

  let selectedSqlFile = null;
  let inputFile;
  let inputFileName = null;
  let inputUploadName = null;
  let isUploading = false;
  let activeUploadCount = 0;
  let latestUploadRequest = 0;
  let destroyed = false;

  let runnerId = null;
  let executeNumber = 0;
  let runningUploadName = null;

  const connection = useConnectionInfo({ conid });

  const sqlFiles = useFiles({ folder: 'sql' });

  const electron = getElectron();
  const isPremium = isProApp();

  $: driver = findEngineDriver($connection, $extensions);
  $: formArgs = (driver?.getNativeOperationFormArgs ? driver.getNativeOperationFormArgs('restore') : null) ?? [];
  $: restoreToolArg = formArgs.find(arg => arg.name == 'restoreTool');
  let restoreTool = null;
  $: if (driver && !restoreTool) {
    restoreTool = driver.supportsNodejsRestore ? 'dbgate-pg-dumper' : 'native';
  }
  $: isUploading = activeUploadCount > 0;

  async function discardUpload(uploadName) {
    if (!uploadName) return;
    try {
      await apiCall('uploads/remove', { uploadName });
    } catch (error) {
      console.error('Error removing temporary restore upload', error);
    }
  }

  $: if (sourceType != 'upload' && inputUploadName && inputUploadName != runningUploadName) {
    const unusedUploadName = inputUploadName;
    inputFile = null;
    inputFileName = null;
    inputUploadName = null;
    discardUpload(unusedUploadName);
  }

  onDestroy(() => {
    destroyed = true;
    latestUploadRequest += 1;
    if (inputUploadName && inputUploadName != runningUploadName) {
      discardUpload(inputUploadName);
    }
  });

  async function getRestoreParams() {
    let usedFile = inputFile;
    if (sourceType == 'sqlFilesFolder') {
      if (!selectedSqlFile) {
        throw new Error('Source SQL file not selected');
      }

      const resp = await apiCall('files/get-file-real-path', { folder: 'sql', file: selectedSqlFile });
      if (!resp) return;
      usedFile = resp;
    }

    if (!usedFile) {
      throw new Error('Nothing to import');
    }

    return {
      conid,
      database,
      inputFile: usedFile,
      inputUploadName: sourceType == 'upload' ? inputUploadName : null,
      runid: runnerId,
      options: { restoreTool },
    };
  }

  async function handleExecute() {
    busy = true;
    operationStatus = 'Running';

    try {
      runnerId = uuidv1();
      executeNumber += 1;

      const restoreParams = await getRestoreParams();
      runningUploadName = restoreParams.inputUploadName;
      const resp = await apiCall('database-connections/native-restore', restoreParams);
      if (resp?.errorMessage) {
        busy = false;
        operationStatus = 'Failed';
        clearFinishedUpload();
      }
    } catch (err) {
      busy = false;
      operationStatus = 'Failed';
      showSnackbarError(err.message);
    }
  }

  async function handleCancel() {
    await apiCall('runners/cancel', { runid: runnerId });
  }

  async function handleGenerateCommand() {
    try {
      const resp = await apiCall('database-connections/native-restore-command', await getRestoreParams());
      copyTextToClipboard(resp.commandLine);
    } catch (err) {
      showSnackbarError(err.message);
    }
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

  function clearFinishedUpload() {
    if (runningUploadName && inputUploadName == runningUploadName) {
      inputFile = null;
      inputFileName = null;
      inputUploadName = null;
    }
    runningUploadName = null;
  }

  const handleRunnerDone = code => {
    busy = false;
    operationStatus = code === 0 ? 'Finished' : code == null ? 'Cancelled' : 'Failed';
    clearFinishedUpload();
  };

  async function handleUploadFile(e) {
    const files = [...e.target.files];
    if (!files.length) return;

    const uploadRequest = ++latestUploadRequest;
    activeUploadCount += 1;
    try {
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('name', file.name);
          formData.append('data', file);

          const fetchOptions = {
            method: 'POST',
            body: formData,
            headers: resolveApiHeaders(),
          };

          const apiBase = resolveApi();
          const resp = await fetch(`${apiBase}/uploads/upload`, fetchOptions);
          const responseText = await resp.text();
          let fileData = null;
          try {
            fileData = responseText ? JSON.parse(responseText) : null;
          } catch {
            if (resp.ok) {
              throw new Error('Upload returned an invalid response');
            }
          }
          if (!resp.ok) {
            throw new Error(fileData?.message || responseText || `Upload failed with HTTP status ${resp.status}`);
          }
          if (!fileData?.filePath) {
            throw new Error('Upload did not return a file path');
          }
          if (destroyed || uploadRequest != latestUploadRequest) {
            await discardUpload(fileData.uploadName);
            continue;
          }
          const previousUploadName = inputUploadName;
          inputFile = fileData.filePath;
          inputFileName = fileData.originalName;
          inputUploadName = fileData.uploadName;
          if (previousUploadName && previousUploadName != runningUploadName) {
            await discardUpload(previousUploadName);
          }
        } catch (error) {
          if (!destroyed && uploadRequest == latestUploadRequest) {
            showSnackbarError(error.message);
          }
        }
      }
    } finally {
      activeUploadCount -= 1;
      e.target.value = null;
    }
  }

  async function handleBrowse() {
    const filePaths = await electron.showOpenDialog({
      filters: [
        {
          name: `All supported files`,
          extensions: ['sql'],
        },
        { name: `SQL files`, extensions: ['sql'] },
      ],
      properties: ['showHiddenFiles', 'openFile'],
    });
    const filePath = filePaths?.[0];
    if (!filePath) return;

    inputFile = filePath;
    inputFileName = filePath.split(/[\\/]/).pop();
    inputUploadName = null;
  }
</script>

<ToolStripContainer>
  <VerticalSplitter initialValue={isPremium ? '320px' : '200px'}>
    <svelte:fragment slot="1">
      <div class="content">
        <div class="source">
          <div class="labelw">
            <FontIcon icon="icon import" />
            Source:
          </div>
          <div>
            <div>
              <input type="radio" bind:group={sourceType} value="sqlFilesFolder" id={`__sqlFilesFolder_${tabid}`} />
              <label for={`__sqlFilesFolder_${tabid}`}>SQL Files folder</label>
              {#if sourceType == 'sqlFilesFolder'}
                <SelectField
                  label="File:"
                  value={selectedSqlFile}
                  options={$sqlFiles?.map(x => ({ value: x.file, label: x.file })) || []}
                  isNative
                  notSelected
                  on:change={e => {
                    selectedSqlFile = e.detail;
                  }}
                />
              {/if}
            </div>
            {#if electron}
              <div>
                <input type="radio" bind:group={sourceType} value="browse" id={`__browse_${tabid}`} />
                <label for={`__browse_${tabid}`}>Browse</label>
                {#if inputFileName && sourceType == 'browse'}
                  <span>: {inputFileName}</span>
                {/if}
              </div>
            {:else}
              <div>
                <input type="radio" bind:group={sourceType} value="upload" id={`__upload_${tabid}`} />
                <label for={`__upload_${tabid}`}>Upload</label>
              </div>
            {/if}

            {#if sourceType == 'upload' && !electron}
              <div class="m-3">
                <FormStyledButtonLikeLabel htmlFor={`uploadRestoreFileButton_${tabid}`}
                  >Upload file</FormStyledButtonLikeLabel
                >
                <input type="file" id={`uploadRestoreFileButton_${tabid}`} hidden on:change={handleUploadFile} />
                {#if isUploading}
                  <LoadingInfo message="Uploading..." />
                {:else if inputFileName}
                  <div
                    class="selected-file"
                    title={inputFileName}
                    data-testid="RestoreDatabaseTab_selectedUploadFile"
                  >
                    Uploaded file: {inputFileName}
                  </div>
                {/if}
              </div>
            {/if}

            {#if sourceType == 'browse' && electron}
              <div class="m-3">
                <FormStyledButton on:click={handleBrowse} value="Browse" />
              </div>
            {/if}
          </div>
        </div>
        <div class="target">
          <div class="labelw">
            <FontIcon icon="icon export" />
            Target:
          </div>
          <div>
            <FontIcon icon="icon server" />
            {getConnectionLabel($connection)}
            {#if database}
              <FontIcon icon="icon database" />
              {database}
            {/if}
          </div>
          <div class="engine">
            {getEngineLabel($connection)}
          </div>
        </div>
        <div class="status">
          <div class="labelw">
            <FontIcon icon="icon info" />
            Status:
          </div>
          <div data-testid="RestoreDatabaseTab_status">{operationStatus}</div>
        </div>
        {#if restoreToolArg && isPremium}
          <div class="options">
            <div class="option-label">Restore tool</div>
            <SelectField
              isNative
              value={restoreTool}
              defaultValue={restoreToolArg.default}
              options={restoreToolArg.options.map(option => ({ label: option.name, value: option.value }))}
              data-testid="RestoreDatabaseTab_restoreTool"
              on:change={event => (restoreTool = event.detail)}
            />
          </div>
        {/if}
      </div>
    </svelte:fragment>

    <svelte:fragment slot="2">
      <WidgetColumnBar>
        <WidgetColumnBarItem title="Messages" name="messages">
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
      <ToolStripButton icon="icon stop" on:click={handleCancel} data-testid="RestoreDatabaseTab_stopButton"
        >Stop</ToolStripButton
      >
    {:else}
      <ToolStripButton
        on:click={handleExecute}
        icon="icon run"
        disabled={isUploading}
        data-testid="RestoreDatabaseTab_executeButton"
        >Run</ToolStripButton
      >
    {/if}
    {#if isPremium && restoreTool != 'dbgate-pg-dumper'}
      <ToolStripButton
        icon="img shell"
        on:click={handleGenerateCommand}
        disabled={isUploading}
        data-testid="RestoreDatabaseTab_generateCommand"
        >Copy command line</ToolStripButton
      >
    {/if}
  </svelte:fragment>

  {#if busy}
    <LoadingInfo wrapper message="Importing SQL dump" />
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
  .target,
  .status {
    margin: 10px;
    padding: 10px;
    font-size: 15px;
    border: var(--theme-table-border);
    display: flex;
  }

  .source {
    margin-bottom: 0px;
  }

  .target {
    margin-top: 0px;
    margin-bottom: 0px;
  }

  .status {
    margin-top: 0px;
  }

  .options {
    margin: 0 10px 10px;
  }

  .option-label {
    color: var(--theme-generic-font-grayed);
    margin-bottom: 3px;
  }

  .labelw {
    width: 8em;
  }

  .engine {
    color: var(--theme-generic-font-grayed);
    margin-left: 10px;
  }

  .selected-file {
    margin-top: 10px;
    overflow-wrap: anywhere;
  }
</style>
