<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('ShellTab');

  registerFileCommands({
    idPrefix: 'shell',
    category: 'Shell',
    getCurrentEditor,
    folder: 'shell',
    format: 'text',
    fileExtension: 'js',

    execute: true,
    toggleComment: true,
    findReplace: true,
    executeAdditionalCondition: () => getCurrentConfig().allowShellScripting,
  });

  registerCommand({
    id: 'shell.copyNodeScript',
    category: 'Shell',
    name: 'Copy nodejs script',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().copyNodeScript(),
  });

  const requireRegex = /\s*(\/\/\s*@require\s+[^\n]+)\n/g;
  const initRegex = /([^\n]+\/\/\s*@init)/g;
</script>

<script lang="ts">
  import { getContext } from 'svelte';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripSaveButton from '../buttons/ToolStripSaveButton.svelte';

  import invalidateCommands from '../commands/invalidateCommands';
  import registerCommand from '../commands/registerCommand';
  import { registerFileCommands } from '../commands/stdCommands';

  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import AceEditor from '../query/AceEditor.svelte';
  import RunnerOutputPane from '../query/RunnerOutputPane.svelte';
  import useEditorData from '../query/useEditorData';
  import { getCurrentConfig } from '../stores';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import { copyTextToClipboard } from '../utility/clipboard';
  import { changeTab } from '../utility/common';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { showSnackbarError } from '../utility/snackbar';
  import useEffect from '../utility/useEffect';
  import useTimerLabel from '../utility/useTimerLabel';
  
  export let tabid;

  const tabFocused: any = getContext('tabFocused');
  const timerLabel = useTimerLabel();

  let runnerId;

  export const activator = createActivator('ShellTab', false);

  let busy = false;
  let executeNumber = 0;

  let domEditor;
  let domToolStrip;

  // const status = writable({
  //   busy,
  //   canKill: false,
  // });

  // $: {
  //   status.set({
  //     busy,
  //     canKill: busy,
  //   });
  // }

  $: {
    busy;
    invalidateCommands();
  }

  $: if ($tabFocused && domEditor) {
    domEditor?.getEditor()?.focus();
  }

  $: {
    changeTab(tabid, tab => ({ ...tab, busy }));
  }

  $: effect = useEffect(() => registerRunnerDone(runnerId));
  $: $effect;

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

  function handleRunnerDone() {
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

  export function isBusy() {
    return busy;
  }

  export async function copyNodeScript() {
    const resp = await apiCall('runners/get-node-script', { script: getActiveScript() });
    copyTextToClipboard(resp);
  }

  function getActiveScript() {
    const selectedText = domEditor.getEditor().getSelectedText();
    const editorText = $editorValue;
    return selectedText
      ? [...(editorText || '').matchAll(requireRegex)].map(x => `${x[1]}\n`).join('') +
          [...(editorText || '').matchAll(initRegex)].map(x => `${x[1]}\n`).join('') +
          selectedText
      : editorText;
  }

  export async function execute() {
    if (busy) return;
    executeNumber += 1;

    let runid = runnerId;
    const resp = await apiCall('runners/start', {
      script: getActiveScript(),
    });
    if (resp.errorMessage) {
      showSnackbarError(resp.errorMessage);
      return;
    }

    runid = resp.runid;
    runnerId = runid;
    busy = true;
    timerLabel.start();
  }

  export function canKill() {
    return busy;
  }

  export function kill() {
    apiCall('runners/cancel', {
      runid: runnerId,
    });
    timerLabel.stop();
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
      { command: 'shell.copyNodeScript' },
      { divider: true },
      { command: 'shell.find' },
      { command: 'shell.replace' },
    ];
  }
</script>

<ToolStripContainer bind:this={domToolStrip}>
  <VerticalSplitter>
    <svelte:fragment slot="1">
      <AceEditor
        value={$editorState.value || ''}
        menu={createMenu()}
        on:input={e => setEditorData(e.detail)}
        on:focus={() => {
          activator.activate();
          domToolStrip?.activate();
          invalidateCommands();
        }}
        bind:this={domEditor}
        mode="javascript"
      />
    </svelte:fragment>
    <svelte:fragment slot="2">
      <RunnerOutputPane {runnerId} {executeNumber} />
    </svelte:fragment>
  </VerticalSplitter>
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="shell.execute" />
    <ToolStripCommandButton command="shell.kill" />
    <ToolStripSaveButton idPrefix="shell" />
    <ToolStripCommandButton command="shell.copyNodeScript" />
  </svelte:fragment>
</ToolStripContainer>
