<script lang="ts" context="module">
  const lastFocusedEditor = writable(null);
  const currentEditor = derived([lastFocusedEditor, activeTabId], ([editor, tabid]) =>
    editor?.getTabId() == tabid ? editor : null
  );
  const currentEditorStatus = memberStore(currentEditor, editor => editor?.getStatus() || nullStore);

  registerCommand({
    id: 'query.formatCode',
    category: 'Query',
    name: 'Format code',
    enabledStore: derived(currentEditor, query => query != null),
    onClick: () => get(currentEditor).formatCode(),
  });
  registerFileCommands({
    idPrefix: 'query',
    category: 'Query',
    editorStore: currentEditor,
    editorStatusStore: currentEditorStatus,
    folder: 'sql',
    format: 'text',
    fileExtension: 'sql',

    execute: true,
    toggleComment:true,
    findReplace:true
  });
</script>

<script lang="ts">
  import { get_current_component } from 'svelte/internal';
  import { getContext } from 'svelte';
  import sqlFormatter from 'sql-formatter';

  import { writable, derived, get } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';

  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import { activeTabId, extensions, nullStore } from '../stores';
  import applySqlTemplate from '../utility/applySqlTemplate';
  import axiosInstance from '../utility/axiosInstance';
  import { changeTab } from '../utility/common';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import socket from '../utility/socket';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import memberStore from '../utility/memberStore';
  import useEffect from '../utility/useEffect';
  import ResultTabs from '../query/ResultTabs.svelte';
  import { registerFileCommands } from '../commands/stdCommands';

  export let tabid;
  export let conid;
  export let database;
  export let initialArgs;

  const instance = get_current_component();
  const tabVisible: any = getContext('tabVisible');

  let busy = false;
  let executeNumber = 0;
  let visibleResultTabs = false;
  let sessionId = null;

  let domEditor;

  const status = writable({
    busy,
    canKill: false,
  });

  $: connection = useConnectionInfo({ conid });

  $: effect = useEffect(() => {
    return onSession(sessionId);
  });
  function onSession(sid) {
    if (sid) {
      socket.on(`session-done-${sid}`, handleSessionDone);
      return () => {
        socket.off(`session-done-${sid}`, handleSessionDone);
      };
    }
    return () => {};
  }
  $: $effect;

  $: {
    changeTab(tabid, tab => ({ ...tab, busy }));
  }

  $: {
    status.set({
      busy,
      canKill: !!sessionId,
    });
  }

  $: if ($tabVisible && domEditor) {
    domEditor?.getEditor()?.focus();
  }

  export function getTabId() {
    return tabid;
  }

  export async function execute() {
    if (busy) return;
    executeNumber++;
    visibleResultTabs = true;
    const selectedText = domEditor.getEditor().getSelectedText();

    let sesid = sessionId;
    if (!sesid) {
      const resp = await axiosInstance.post('sessions/create', {
        conid,
        database,
      });
      sesid = resp.data.sesid;
      sessionId = sesid;
    }
    busy = true;
    // timerLabel.start();
    await axiosInstance.post('sessions/execute-query', {
      sesid,
      sql: selectedText || $editorValue,
    });
  }

  export async function kill() {
    await axiosInstance.post('sessions/kill', {
      sesid: sessionId,
    });
    sessionId = null;
    busy = false;
    // timerLabel.stop();
  }

  export function getStatus() {
    return status;
  }

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

  const handleMesageClick = message => {
    // console.log('EDITOR', editorRef.current.editor);
    if (domEditor.getEditor()) {
      domEditor.getEditor().gotoLine(message.line);
    }
  };

  const handleSessionDone = () => {
    busy = false;
    // timerLabel.stop();
  };

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    loadFromArgs:
      initialArgs && initialArgs.sqlTemplate
        ? () => applySqlTemplate(initialArgs.sqlTemplate, $extensions, $$props)
        : null,
  });

  function createMenu() {
    return [
      { command: 'query.execute' },
      { command: 'query.kill' },
      { divider: true },
      { command: 'query.toggleComment' },
      { command: 'query.formatCode' },
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
    <SqlEditor
      engine={$connection && $connection.engine}
      value={$editorState.value || ''}
      menu={createMenu()}
      on:input={e => setEditorData(e.detail)}
      on:focus={() => lastFocusedEditor.set(instance)}
      bind:this={domEditor}
    />
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
