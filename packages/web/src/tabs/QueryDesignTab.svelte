<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('QueryDesignTab');

  registerCommand({
    id: 'designer.openSql',
    category: 'Designer',
    icon: 'icon sql-file',
    name: 'Open SQL',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().openSql(),
  });

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
  import sqlFormatter from 'sql-formatter';

  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import { extensions } from '../stores';
  import { changeTab } from '../utility/common';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import useEffect from '../utility/useEffect';
  import ResultTabs from '../query/ResultTabs.svelte';
  import { registerFileCommands } from '../commands/stdCommands';
  import invalidateCommands from '../commands/invalidateCommands';
  import QueryDesigner from '../designer/QueryDesigner.svelte';
  import createUndoReducer from '../utility/createUndoReducer';
  import _ from 'lodash';
  import { findEngineDriver } from 'dbgate-tools';
  import { generateDesignedQuery } from '../designer/designerTools';
  import QueryDesignColumns from '../elements/QueryDesignColumns.svelte';
  import useTimerLabel from '../utility/useTimerLabel';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import registerCommand from '../commands/registerCommand';
  import newQuery from '../query/newQuery';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripExportButton, { createQuickExportHandlerRef } from '../buttons/ToolStripExportButton.svelte';
  import ToolStripSaveButton from '../buttons/ToolStripSaveButton.svelte';
  import { onDestroy, onMount } from 'svelte';

  export let tabid;
  export let conid;
  export let database;
  export let initialArgs;

  const timerLabel = useTimerLabel();

  let busy = false;
  let executeNumber = 0;
  let visibleResultTabs = false;
  let sessionId = null;
  let sqlPreview = '';

  export const activator = createActivator('QueryDesignTab', true);

  $: connection = useConnectionInfo({ conid });
  $: engine = findEngineDriver($connection, $extensions);

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
    $modelState;
    invalidateCommands();
  }

  $: setEditorData($modelState.value);

  $: generatePreview($modelState.value, engine);

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
      sql: sqlPreview,
    });
  }

  export async function kill() {
    await apiCall('sessions/kill', {
      sesid: sessionId,
    });
    sessionId = null;
    busy = false;
    timerLabel.stop();
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

  export function openSql() {
    newQuery({ initialData: sqlPreview });
  }

  const generatePreview = (value, engine) => {
    if (!engine || !value) return;
    const sql = generateDesignedQuery(value, engine);
    sqlPreview = sqlFormatter.format(sql);
  };

  const handleSessionDone = () => {
    busy = false;
    timerLabel.stop();
  };

  const handleSessionClosed = () => {
    sessionId = null;
    handleSessionDone();
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
      { command: 'designer.openSql' },
      { divider: true },
      { command: 'designer.save' },
      { command: 'designer.saveAs' },
      { divider: true },
      { command: 'designer.undo' },
      { command: 'designer.redo' },
      { divider: true },
      {
        text: `Remove duplicates: ${$editorState.value?.settings?.isDistinct ? 'YES' : 'NO'}`,
        onClick: () => {
          handleChange(
            {
              ...$editorState.value,
              settings: {
                ...$editorState.value?.settings,
                isDistinct: !$editorState.value?.settings?.isDistinct,
              },
            },
            false
          );
        },
      },
    ];
  }

  const quickExportHandlerRef = createQuickExportHandlerRef();
</script>

<ToolStripContainer>
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
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="designer.execute" />
    <ToolStripCommandButton command="designer.kill" />
    <ToolStripCommandButton command="designer.openSql" />
    <ToolStripSaveButton idPrefix="designer" />
    <ToolStripExportButton command="jslTableGrid.export" {quickExportHandlerRef} label="Export result" />
  </svelte:fragment>
</ToolStripContainer>
