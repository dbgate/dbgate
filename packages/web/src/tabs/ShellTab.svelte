<script lang="ts" context="module">
  const lastFocusedEditor = writable(null);
  const currentEditor = derived([lastFocusedEditor, activeTabId], ([editor, tabid]) =>
    editor?.getTabId && editor?.getTabId() == tabid ? editor : null
  );
  const currentEditorStatus = memberStore(currentEditor, editor => editor?.getStatus() || nullStore);

  registerFileCommands({
    idPrefix: 'shell',
    category: 'Shell',
    editorStore: currentEditor,
    editorStatusStore: currentEditorStatus,
    folder: 'shell',
    format: 'text',
    fileExtension: 'js',

    execute: true,
    toggleComment: true,
    findReplace: true,
  });

  const configRegex = /\s*\/\/\s*@ImportExportConfigurator\s*\n\s*\/\/\s*(\{[^\n]+\})\n/;
  const requireRegex = /\s*(\/\/\s*@require\s+[^\n]+)\n/g;
  const initRegex = /([^\n]+\/\/\s*@init)/g;
</script>

<script lang="ts">
  import { getContext, get_current_component } from 'svelte/internal';

  import { derived, writable } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';
  import { registerFileCommands } from '../commands/stdCommands';

  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import AceEditor from '../query/AceEditor.svelte';
  import RunnerOutputPane from '../query/RunnerOutputPane.svelte';
  import useEditorData from '../query/useEditorData';
  import { activeTabId, nullStore } from '../stores';
  import axiosInstance from '../utility/axiosInstance';
  import memberStore from '../utility/memberStore';
  import socket from '../utility/socket';
  import useEffect from '../utility/useEffect';

  export let tabid;

  const tabVisible: any = getContext('tabVisible');

  let runnerId;

  const instance = get_current_component();

  let busy = false;
  let executeNumber = 0;

  let domEditor;

  const status = writable({
    busy,
    canKill: false,
  });

  $: {
    status.set({
      busy,
      canKill: busy,
    });
  }

  $: if ($tabVisible && domEditor) {
    domEditor?.getEditor()?.focus();
  }

  $: effect = useEffect(() => registerRunnerDone(runnerId));

  function registerRunnerDone(rid) {
    if (rid) {
      socket.on(`runner-done-${rid}`, handleRunnerDone);
      return () => {
        socket.off(`runner-done-${rid}`, handleRunnerDone);
      };
    } else {
      return () => {};
    }
  }

  $: $effect;

  function handleRunnerDone() {
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

  export function getTabId() {
    return tabid;
  }

  export async function execute() {
    if (busy) return;
    executeNumber += 1;
    const selectedText = domEditor.getEditor().getSelectedText();
    const editorText = $editorValue;

    let runid = runnerId;
    const resp = await axiosInstance.post('runners/start', {
      script: selectedText
        ? [...(editorText || '').matchAll(requireRegex)].map(x => `${x[1]}\n`).join('') +
          [...(editorText || '').matchAll(initRegex)].map(x => `${x[1]}\n`).join('') +
          selectedText
        : editorText,
    });
    runid = resp.data.runid;
    runnerId = runid;
    busy = true;
    //timerLabel.start();
  }

  export function kill() {
    axiosInstance.post('runners/cancel', {
      runid: runnerId,
    });
    // timerLabel.stop();
  }

  const { editorState, editorValue, setEditorData } = useEditorData({ tabid });

  function createMenu() {
    return [
      { command: 'shell.execute' },
      { command: 'shell.kill' },
      { divider: true },
      { command: 'shell.toggleComment' },
      { divider: true },
      { command: 'shell.save' },
      { command: 'shell.saveAs' },
      { divider: true },
      { command: 'shell.find' },
      { command: 'shell.replace' },
    ];
  }
</script>

<VerticalSplitter>
  <svelte:fragment slot="1">
    <AceEditor
      value={$editorState.value || ''}
      menu={createMenu()}
      on:input={e => setEditorData(e.detail)}
      on:focus={() => lastFocusedEditor.set(instance)}
      bind:this={domEditor}
      mode="javascript"
    />
  </svelte:fragment>
  <svelte:fragment slot="2">
    <RunnerOutputPane {runnerId} {executeNumber} />
  </svelte:fragment>
</VerticalSplitter>
