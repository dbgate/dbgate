<script lang="ts" context="module">
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
    keyText: 'Ctrl+J',
    testEnabled: () => getCurrentEditor()?.isSqlEditor(),
    onClick: () => getCurrentEditor().insertSqlJoin(),
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
  });
  registerCommand({
    id: 'query.executeCurrent',
    category: 'Query',
    name: 'Execute current',
    keyText: 'Ctrl+Shift+Enter',
    testEnabled: () =>
      getCurrentEditor() != null && !getCurrentEditor()?.isBusy() && getCurrentEditor()?.hasConnection(),
    onClick: () => getCurrentEditor().executeCurrent(),
  });
</script>

<script lang="ts">
  import { getContext } from 'svelte';
  import sqlFormatter from 'sql-formatter';

  import registerCommand from '../commands/registerCommand';

  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import { extensions } from '../stores';
  import applyScriptTemplate from '../utility/applyScriptTemplate';
  import axiosInstance from '../utility/axiosInstance';
  import { changeTab } from '../utility/common';
  import { getDatabaseInfo, useConnectionInfo } from '../utility/metadataLoaders';
  import socket from '../utility/socket';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import useEffect from '../utility/useEffect';
  import ResultTabs from '../query/ResultTabs.svelte';
  import { registerFileCommands } from '../commands/stdCommands';
  import invalidateCommands from '../commands/invalidateCommands';
  import { showModal } from '../modals/modalTools';
  import InsertJoinModal from '../modals/InsertJoinModal.svelte';
  import useTimerLabel from '../utility/useTimerLabel';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { findEngineDriver } from 'dbgate-tools';
  import AceEditor from '../query/AceEditor.svelte';
  import StatusBarTabItem from '../widgets/StatusBarTabItem.svelte';
  import { showSnackbarError } from '../utility/snackbar';

  export let tabid;
  export let conid;
  export let database;
  export let initialArgs;

  export const activator = createActivator('QueryTab', false);

  const tabVisible: any = getContext('tabVisible');
  const timerLabel = useTimerLabel();

  let busy = false;
  let executeNumber = 0;
  let visibleResultTabs = false;
  let sessionId = null;

  let domEditor;

  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);

  $: effect = useEffect(() => {
    return onSession(sessionId);
  });
  function onSession(sid) {
    if (sid) {
      socket().on(`session-done-${sid}`, handleSessionDone);
      return () => {
        socket().off(`session-done-${sid}`, handleSessionDone);
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
    return !driver?.dialect?.nosql;
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
    return !!conid;
  }

  async function executeCore(sql) {
    if (busy) return;
    if (!sql || !sql.trim()) {
      showSnackbarError('Skipped executing empty query');
      return;
    }

    executeNumber++;
    visibleResultTabs = true;

    let sesid = sessionId;
    if (!sesid) {
      const resp = await axiosInstance().post('sessions/create', {
        conid,
        database,
      });
      sesid = resp.data.sesid;
      sessionId = sesid;
    }
    busy = true;
    timerLabel.start();
    await axiosInstance().post('sessions/execute-query', {
      sesid,
      sql,
    });
    await axiosInstance().post('query-history/write', {
      data: {
        sql,
        conid,
        database,
        date: new Date().getTime(),
      },
    });
  }

  export async function executeCurrent() {
    const sql = domEditor.getCurrentCommandText();
    await executeCore(sql);
  }

  export async function execute() {
    const selectedText = domEditor.getEditor().getSelectedText();
    await executeCore(selectedText || $editorValue);
  }

  export async function kill() {
    await axiosInstance().post('sessions/kill', {
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

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    loadFromArgs:
      initialArgs && initialArgs.scriptTemplate
        ? () => applyScriptTemplate(initialArgs.scriptTemplate, $extensions, $$props)
        : null,
  });

  function createMenu() {
    return [
      { command: 'query.execute' },
      { command: 'query.kill' },
      { divider: true },
      { command: 'query.toggleComment' },
      { command: 'query.formatCode' },
      { command: 'query.insertSqlJoin' },
      { divider: true },
      { command: 'query.save' },
      { command: 'query.saveAs' },
      { divider: true },
      { command: 'query.find' },
      { command: 'query.replace' },
    ];
  }
</script>

<VerticalSplitter isSplitter={visibleResultTabs}>
  <svelte:fragment slot="1">
    {#if driver?.dialect?.nosql}
      <AceEditor
        mode="javascript"
        value={$editorState.value || ''}
        splitterOptions={driver?.getQuerySplitterOptions('script')}
        menu={createMenu()}
        on:input={e => setEditorData(e.detail)}
        on:focus={() => {
          activator.activate();
          invalidateCommands();
        }}
        bind:this={domEditor}
      />
    {:else}
      <SqlEditor
        engine={$connection && $connection.engine}
        {conid}
        {database}
        splitterOptions={driver?.getQuerySplitterOptions('script')}
        value={$editorState.value || ''}
        menu={createMenu()}
        on:input={e => setEditorData(e.detail)}
        on:focus={() => {
          activator.activate();
          invalidateCommands();
        }}
        bind:this={domEditor}
      />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="2">
    <ResultTabs tabs={[{ label: 'Messages', slot: 0 }]} {sessionId} {executeNumber}>
      <svelte:fragment slot="0">
        <SocketMessageView
          eventName={sessionId ? `session-info-${sessionId}` : null}
          on:messageClick={handleMesageClick}
          {executeNumber}
          showProcedure
          showLine
        />
      </svelte:fragment>
    </ResultTabs>
  </svelte:fragment>
</VerticalSplitter>

{#if sessionId}
  <StatusBarTabItem icon={busy ? 'icon loading' : 'icon check'} text={busy ? 'Running...' : 'Finished'} />
{/if}
