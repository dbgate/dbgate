<script lang="ts" context="module">
  import registerCommand from '../commands/registerCommand';
  import { copyTextToClipboard } from '../utility/clipboard';

  const getCurrentEditor = () => getActiveComponent('QueryTab');

  registerCommand({
    id: 'query.formatCode',
    category: 'Query',
    name: 'Format code',
    keyText: 'Shift+Alt+F',
    testEnabled: () => getCurrentEditor()?.isSqlEditor(),
    onClick: () => getCurrentEditor().formatCode(),
  });
  registerCommand({
    id: 'query.insertSqlJoin',
    category: 'Query',
    name: 'Insert SQL Join',
    keyText: 'CtrlOrCommand+J',
    testEnabled: () => getCurrentEditor()?.isSqlEditor(),
    onClick: () => getCurrentEditor().insertSqlJoin(),
  });
  registerCommand({
    id: 'query.toggleVisibleResultTabs',
    category: 'Query',
    name: 'Toggle visible result tabs',
    keyText: 'CtrlOrCommand+Shift+R',
    testEnabled: () => !!getCurrentEditor(),
    onClick: () => getCurrentEditor().toggleVisibleResultTabs(),
  });
  registerFileCommands({
    idPrefix: 'query',
    category: 'Query',
    getCurrentEditor,
    folder: 'sql',
    format: 'text',
    fileExtension: 'sql',

    execute: true,
    toggleComment: true,
    findReplace: true,
    executeAdditionalCondition: () => getCurrentEditor()?.hasConnection(),
    copyPaste: true,
  });
  registerCommand({
    id: 'query.executeCurrent',
    category: 'Query',
    name: 'Execute current',
    keyText: 'CtrlOrCommand+Shift+Enter',
    testEnabled: () =>
      getCurrentEditor() != null && !getCurrentEditor()?.isBusy() && getCurrentEditor()?.hasConnection(),
    onClick: () => getCurrentEditor().executeCurrent(),
  });

  export const allowSwitchDatabase = props => true;
</script>

<script lang="ts">
  import { getContext, onDestroy, onMount } from 'svelte';
  import sqlFormatter from 'sql-formatter';

  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import { extensions } from '../stores';
  import applyScriptTemplate from '../utility/applyScriptTemplate';
  import { changeTab, markTabUnsaved } from '../utility/common';
  import { getDatabaseInfo, useConnectionInfo } from '../utility/metadataLoaders';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import useEffect from '../utility/useEffect';
  import ResultTabs from '../query/ResultTabs.svelte';
  import { registerFileCommands } from '../commands/stdCommands';
  import invalidateCommands from '../commands/invalidateCommands';
  import { showModal } from '../modals/modalTools';
  import InsertJoinModal from '../modals/InsertJoinModal.svelte';
  import useTimerLabel from '../utility/useTimerLabel';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { findEngineDriver, safeJsonParse } from 'dbgate-tools';
  import AceEditor from '../query/AceEditor.svelte';
  import StatusBarTabItem from '../widgets/StatusBarTabItem.svelte';
  import { showSnackbarError } from '../utility/snackbar';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';
  import ToolStripSaveButton from '../buttons/ToolStripSaveButton.svelte';
  import ToolStripCommandSplitButton from '../buttons/ToolStripCommandSplitButton.svelte';
  import { getClipboardText } from '../utility/clipboard';
  import ToolStripDropDownButton from '../buttons/ToolStripDropDownButton.svelte';
  import { extractQueryParameters, replaceQueryParameters } from 'dbgate-query-splitter';
  import QueryParametersModal from '../modals/QueryParametersModal.svelte';

  export let tabid;
  export let conid;
  export let database;
  export let initialArgs;

  export const activator = createActivator('QueryTab', false);

  const QUERY_PARAMETER_STYLES = [
    {
      value: '',
      text: '(no parameters)',
    },
    {
      value: '?',
      text: '? (positional)',
    },
    {
      value: '@',
      text: '@variable',
    },
    {
      value: ':',
      text: ':variable',
    },
    {
      value: '$',
      text: '$variable',
    },
    {
      value: '#',
      text: '#variable',
    },
  ];

  const tabVisible: any = getContext('tabVisible');
  const timerLabel = useTimerLabel();

  let busy = false;
  let executeNumber = 0;
  let executeStartLine = 0;
  let visibleResultTabs = false;
  let sessionId = null;
  let resultCount;
  let errorMessages;
  let domEditor;
  let domToolStrip;
  let intervalId;

  onMount(() => {
    intervalId = setInterval(() => {
      if (sessionId) {
        apiCall('sessions/ping', {
          sesid: sessionId,
        });
      }
    }, 15 * 1000);
  });

  onDestroy(() => {
    clearInterval(intervalId);
  });

  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);

  $: effect = useEffect(() => {
    return onSession(sessionId);
  });
  function onSession(sid) {
    if (sid) {
      apiOn(`session-done-${sid}`, handleSessionDone);
      apiOn(`session-closed-${sid}`, handleSessionClosed);
      return () => {
        apiOff(`session-done-${sid}`, handleSessionDone);
        apiOff(`session-closed-${sid}`, handleSessionClosed);
      };
    }
    return () => {};
  }
  $: $effect;

  $: {
    changeTab(tabid, tab => ({ ...tab, busy }));
  }

  $: {
    busy;
    sessionId;
    invalidateCommands();
  }

  $: if ($tabVisible && domEditor) {
    domEditor?.getEditor()?.focus();
  }

  export function isSqlEditor() {
    return driver?.databaseEngineTypes?.includes('sql');
  }

  export function canKill() {
    return !!sessionId;
  }

  export function isBusy() {
    return busy;
  }

  export function getTabId() {
    return tabid;
  }

  export function hasConnection() {
    return !!conid && (!$connection?.isReadOnly || driver?.readOnlySessions);
  }

  export function toggleVisibleResultTabs() {
    visibleResultTabs = !visibleResultTabs;
  }

  function getParameterSplitterOptions() {
    if (!queryParameterStyle) {
      return null;
    }

    if (!driver) {
      return null;
    }

    return { ...driver.getQuerySplitterOptions('editor'), queryParameterStyle };
  }

  async function executeCore(sql, startLine = 0) {
    if (busy) return;

    const parameters = extractQueryParameters(sql, getParameterSplitterOptions());

    if (parameters.length > 0) {
      const defaultValues = {
        ...parameters.reduce((acc, x) => ({ ...acc, [x]: '' }), {}),
        ...safeJsonParse(localStorage.getItem(`tabdata_queryParams_${tabid}`)),
      };

      showModal(QueryParametersModal, {
        parameterNames: parameters,
        parameterValues: defaultValues,
        onExecute: values => {
          localStorage.setItem(`tabdata_queryParams_${tabid}`, JSON.stringify(values));
          const newSql = replaceQueryParameters(sql, values, getParameterSplitterOptions());
          executeCoreWithParams(newSql, startLine);
        },
      });
    } else {
      executeCoreWithParams(sql, startLine);
    }
  }

  async function executeCoreWithParams(sql, startLine = 0) {
    if (!sql || !sql.trim()) {
      showSnackbarError('Skipped executing empty query');
      return;
    }

    executeStartLine = startLine;
    executeNumber++;
    visibleResultTabs = true;

    let sesid = sessionId;
    if (!sesid) {
      const resp = await apiCall('sessions/create', {
        conid,
        database,
      });
      sesid = resp.sesid;
      sessionId = sesid;
    }
    busy = true;
    timerLabel.start();
    await apiCall('sessions/execute-query', {
      sesid,
      sql,
    });
    await apiCall('query-history/write', {
      data: {
        sql,
        conid,
        database,
        date: new Date().getTime(),
      },
    });
  }

  export async function executeCurrent() {
    const cmd = domEditor.getCurrentCommandText();
    await executeCore(cmd.text, cmd.line);
  }

  export async function execute() {
    const selectedText = domEditor.getEditor().getSelectedText();
    const startLine = domEditor.getEditor().getSelectionRange().start.row;
    await executeCore(selectedText || $editorValue, selectedText ? startLine : 0);
  }

  export async function kill() {
    await apiCall('sessions/kill', {
      sesid: sessionId,
    });
    sessionId = null;
    busy = false;
    timerLabel.stop();
  }

  // export function getStatus() {
  //   return status;
  // }

  export function getData() {
    return $editorState.value || '';
  }

  export function toggleComment() {
    domEditor.getEditor().execCommand('togglecomment');
  }

  export function copy() {
    const selectedText = domEditor.getEditor().getSelectedText();
    copyTextToClipboard(selectedText);
  }

  export function paste() {
    getClipboardText().then(text => {
      domEditor.getEditor().execCommand('paste', text);
    });
  }

  export function find() {
    domEditor.getEditor().execCommand('find');
  }

  export function replace() {
    domEditor.getEditor().execCommand('replace');
  }

  export function formatCode() {
    const editor = domEditor.getEditor();
    editor.setValue(sqlFormatter.format(editor.getValue()));
    editor.clearSelection();
  }

  export async function insertSqlJoin() {
    const dbinfo = await getDatabaseInfo({ conid, database });
    showModal(InsertJoinModal, {
      sql: getData(),
      engine: $connection && $connection.engine,
      dbinfo,
      onInsert: text => {
        const editor = domEditor.getEditor();
        editor.session.insert(editor.getCursorPosition(), text);
        domEditor?.getEditor()?.focus();
      },
    });
  }

  const handleMesageClick = message => {
    // console.log('EDITOR', editorRef.current.editor);
    if (domEditor.getEditor()) {
      domEditor.getEditor().gotoLine(message.line);
    }
  };

  const handleSessionDone = () => {
    busy = false;
    timerLabel.stop();
  };

  const handleSessionClosed = () => {
    sessionId = null;
    handleSessionDone();
  };

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    loadFromArgs:
      initialArgs && initialArgs.scriptTemplate
        ? () => applyScriptTemplate(initialArgs.scriptTemplate, $extensions, $$props)
        : null,
  });

  function handleChangeErrors(errors) {
    errorMessages = errors;
  }

  function createMenu() {
    return [
      { command: 'query.execute' },
      { command: 'query.executeCurrent' },
      { command: 'query.kill' },
      { divider: true },
      { command: 'query.toggleComment' },
      { command: 'query.formatCode' },
      { command: 'query.insertSqlJoin' },
      { divider: true },
      { command: 'query.save' },
      { command: 'query.saveAs' },
      { divider: true },
      { command: 'query.copy' },
      { command: 'query.paste' },
      { command: 'query.find' },
      { command: 'query.replace' },
      { divider: true },
      { command: 'query.toggleVisibleResultTabs' },
    ];
  }

  const quickExportHandlerRef = createQuickExportHandlerRef();

  $: {
    conid;
    database;
    if (canKill()) {
      kill();
    }
    errorMessages = [];
  }

  let isInitialized = false;
  let queryParameterStyle = localStorage.getItem(`tabdata_queryParamStyle_${tabid}`) ?? '';
</script>

<ToolStripContainer bind:this={domToolStrip}>
  <VerticalSplitter isSplitter={visibleResultTabs}>
    <svelte:fragment slot="1">
      {#if driver?.databaseEngineTypes?.includes('sql')}
        <SqlEditor
          engine={$connection && $connection.engine}
          {conid}
          {database}
          splitterOptions={driver?.getQuerySplitterOptions('editor')}
          value={$editorState.value || ''}
          menu={createMenu()}
          on:input={e => {
            setEditorData(e.detail);
            if (isInitialized) {
              markTabUnsaved(tabid);
            }
            errorMessages = [];
          }}
          on:focus={() => {
            activator.activate();
            domToolStrip?.activate();
            invalidateCommands();
            setTimeout(() => {
              isInitialized = true;
            }, 100);
          }}
          bind:this={domEditor}
          onExecuteFragment={(sql, startLine) => executeCore(sql, startLine)}
          {errorMessages}
        />
      {:else}
        <AceEditor
          mode={driver?.editorMode || 'text'}
          value={$editorState.value || ''}
          splitterOptions={driver?.getQuerySplitterOptions('editor')}
          menu={createMenu()}
          on:input={e => setEditorData(e.detail)}
          on:focus={() => {
            activator.activate();
            domToolStrip?.activate();
            invalidateCommands();
          }}
          bind:this={domEditor}
        />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="2">
      <ResultTabs tabs={[{ label: 'Messages', slot: 0 }]} {sessionId} {executeNumber} bind:resultCount {driver}>
        <svelte:fragment slot="0">
          <SocketMessageView
            eventName={sessionId ? `session-info-${sessionId}` : null}
            on:messageClick={handleMesageClick}
            {executeNumber}
            startLine={executeStartLine}
            showProcedure
            showLine
            onChangeErrors={handleChangeErrors}
          />
        </svelte:fragment>
      </ResultTabs>
    </svelte:fragment>
  </VerticalSplitter>
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandSplitButton commands={['query.execute', 'query.executeCurrent']} />
    <ToolStripCommandButton command="query.kill" />
    <ToolStripSaveButton idPrefix="query" />
    <ToolStripCommandButton command="query.formatCode" />
    {#if resultCount == 1}
      <ToolStripExportButton command="jslTableGrid.export" {quickExportHandlerRef} label="Export result" />
    {/if}
    <ToolStripDropDownButton
      menu={() =>
        QUERY_PARAMETER_STYLES.map(param => ({
          label: param.text,
          onClick: () => {
            queryParameterStyle = param.value;
            localStorage.setItem(`tabdata_queryParamStyle_${tabid}`, queryParameterStyle);
          },
        }))}
      label={QUERY_PARAMETER_STYLES.find(x => x.value == queryParameterStyle)?.text}
      icon="icon at"
      title="Query parameter style"
    />
  </svelte:fragment>
</ToolStripContainer>

{#if sessionId}
  <StatusBarTabItem icon={busy ? 'icon loading' : 'icon check'} text={busy ? 'Running...' : 'Finished'} />
{/if}
