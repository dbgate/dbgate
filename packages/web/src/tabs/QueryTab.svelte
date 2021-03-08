<script lang="ts" context="module">
  const currentQuery = writable(null);
  const currentQueryStatus = memberStore(currentQuery, query => query?.getStatus() || nullStore);

  registerCommand({
    id: 'query.execute',
    category: 'Query',
    name: 'Execute',
    icon: 'icon run',
    toolbar: true,
    keyText: 'F5 | Ctrl+Enter',
    enabledStore: derived(
      [currentQuery, currentQueryStatus],
      ([query, status]) => query != null && !(status as any).busy
    ),
    onClick: () => get(currentQuery).execute(),
  });
  registerCommand({
    id: 'query.kill',
    category: 'Query',
    name: 'Kill',
    icon: 'icon close',
    toolbar: true,
    enabledStore: derived(
      [currentQuery, currentQueryStatus],
      ([query, status]) => query != null && status && (status as any).isConnected
    ),
    onClick: () => get(currentQuery).kill(),
  });
</script>

<script lang="ts">
  import { get_current_component } from 'svelte/internal';
  import { onDestroy } from 'svelte';

  import { writable, derived, get } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';

  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import { extensions, nullStore } from '../stores';
  import applySqlTemplate from '../utility/applySqlTemplate';
  import axios from '../utility/axios';
  import { changeTab } from '../utility/common';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import socket from '../utility/socket';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import memberStore from '../utility/memberStore';
  import useEffect from '../utility/useEffect';
  import ResultTabs from '../query/ResultTabs.svelte';

  export let tabid;
  export let conid;
  export let database;
  export let initialArgs;

  const instance = get_current_component();

  let busy = false;
  let executeNumber = 0;
  let visibleResultTabs = false;
  let sessionId = null;

  let domEditor;

  const status = writable({
    busy,
    isConnected: false,
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
      isConnected: !!sessionId,
    });
  }

  export async function execute() {
    if (busy) return;
    executeNumber++;
    visibleResultTabs = true;
    const selectedText = domEditor.getEditor().getSelectedText();

    let sesid = sessionId;
    if (!sesid) {
      const resp = await axios.post('sessions/create', {
        conid,
        database,
      });
      sesid = resp.data.sesid;
      sessionId = sesid;
    }
    busy = true;
    // timerLabel.start();
    await axios.post('sessions/execute-query', {
      sesid,
      sql: selectedText || $editorValue,
    });
  }

  export async function kill() {
    await axios.post('sessions/kill', {
      sesid: sessionId,
    });
    sessionId = null;
    busy = false;
    // timerLabel.stop();
  }

  export function getStatus() {
    return status;
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
</script>

<VerticalSplitter isSplitter={visibleResultTabs}>
  <svelte:fragment slot="1">
    <SqlEditor
      engine={$connection && $connection.engine}
      value={$editorState.value || ''}
      on:input={e => setEditorData(e.detail)}
      on:focus={() => currentQuery.set(instance)}
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
