<script lang="ts" context="module">
  let lastFocusedEditor = null;
  const getCurrentEditor = () =>
    lastFocusedEditor?.getTabId && lastFocusedEditor?.getTabId() == getActiveTabId() ? lastFocusedEditor : null;

  registerFileCommands({
    idPrefix: 'designer',
    category: 'Designer',
    getCurrentEditor,
    folder: 'query',
    format: 'json',
    fileExtension: 'qdesign',

    execute: true,
    undoRedo: true,
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
  import { activeTabId, extensions, getActiveTabId, nullStore } from '../stores';
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
  import invalidateCommands from '../commands/invalidateCommands';
  import QueryDesigner from '../designer/QueryDesigner.svelte';
  import createReducer from '../utility/createReducer';
  import createUndoReducer from '../utility/createUndoReducer';
  import _ from 'lodash';
  import { findEngineDriver } from 'dbgate-tools';
  import { generateDesignedQuery } from '../designer/designerTools';
  import QueryDesignColumns from '../elements/QueryDesignColumns.svelte';

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
  let sqlPreview = '';

  let domEditor;

  $: connection = useConnectionInfo({ conid });
  $: engine = findEngineDriver($connection, $extensions);

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
    busy;
    sessionId;
    $modelState;
    invalidateCommands();
  }

  $: setEditorData($modelState.value);

  $: generatePreview($modelState.value, engine);

  $: if ($tabVisible) lastFocusedEditor = instance;

  export function canKill() {
    return !!sessionId;
  }

  export function isBusy() {
    return busy;
  }

  export function getTabId() {
    return tabid;
  }

  export async function execute() {
    if (busy) return;
    executeNumber++;
    visibleResultTabs = true;

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
      sql: sqlPreview,
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

  export function getData() {
    return $editorState.value || '';
  }

  export function canUndo() {
    return $modelState.canUndo;
  }

  export function undo() {
    dispatchModel({ type: 'undo' });
  }

  export function canRedo() {
    return $modelState.canRedo;
  }

  export function redo() {
    dispatchModel({ type: 'redo' });
  }

  const generatePreview = (value, engine) => {
    if (!engine || !value) return;
    const sql = generateDesignedQuery(value, engine);
    sqlPreview = sqlFormatter.format(sql);
  };

  const handleSessionDone = () => {
    busy = false;
    // timerLabel.stop();
  };

  const handleChange = (value, skipUndoChain) =>
    // @ts-ignore
    dispatchModel({
      type: 'compute',
      useMerge: skipUndoChain,
      compute: v => (_.isFunction(value) ? value(v) : value),
    });

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    onInitialData: value => {
      dispatchModel({ type: 'reset', value });
    },
  });

  const [modelState, dispatchModel] = createUndoReducer({
    tables: [],
    references: [],
    columns: [],
  });
  // {visibleResultTabs && (
  //     <TabPage label="Messages" key="messages">
  //       <SocketMessagesView
  //         eventName={sessionId ? `session-info-${sessionId}` : null}
  //         executeNumber={executeNumber}
  //       />
  //     </TabPage>
  //   )}
  function createMenu() {
    return [
      { command: 'designer.execute' },
      { command: 'designer.kill' },
      { divider: true },
      { command: 'designer.save' },
      { command: 'designer.saveAs' },
      { divider: true },
      { command: 'designer.undo' },
      { command: 'designer.redo' },
    ];
  }
</script>

<VerticalSplitter initialValue="70%">
  <svelte:fragment slot="1">
    <QueryDesigner
      value={$modelState.value || {}}
      {conid}
      {database}
      engine={$connection && $connection.engine}
      onChange={handleChange}
      menu={createMenu}
    />
  </svelte:fragment>

  <svelte:fragment slot="2">
    <ResultTabs
      tabs={[
        {
          label: 'Columns',
          component: QueryDesignColumns,
          props: {
            value: $modelState.value || {},
            onChange: handleChange,
          },
        },
        {
          label: 'SQL',
          component: SqlEditor,
          props: {
            engine: $connection && $connection.engine,
            readOnly: true,
            value: sqlPreview,
          },
        },
        visibleResultTabs && { label: 'Messages', slot: 0 },
      ]}
      {sessionId}
      {executeNumber}
    >
      <svelte:fragment slot="0">
        <SocketMessageView
          eventName={sessionId ? `session-info-${sessionId}` : null}
          {executeNumber}
          showProcedure
          showLine
        />
      </svelte:fragment>
    </ResultTabs>
  </svelte:fragment>
</VerticalSplitter>
