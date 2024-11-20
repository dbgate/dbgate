<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('SqlObjectTab');

  registerCommand({
    id: 'sqlObject.find',
    category: 'SQL Object',
    name: 'Find',
    keyText: 'CtrlOrCommand+F',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().find(),
  });
</script>

<script lang="ts">
  import { getContext } from 'svelte';

  import AceEditor from '../query/AceEditor.svelte';
  import invalidateCommands from '../commands/invalidateCommands';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import { extensions } from '../stores';
  import { findEngineDriver } from 'dbgate-tools';
  import registerCommand from '../commands/registerCommand';
  import applyScriptTemplate, { getSupportedScriptTemplates } from '../utility/applyScriptTemplate';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import { changeTab } from '../utility/common';

  export let tabid;
  export let appObjectData;
  export let scriptTemplate;

  $: defaultScriptTemplate = getSupportedScriptTemplates(appObjectData.objectTypeField)?.[0]?.scriptTemplate;

  $: connection = useConnectionInfo({ conid: appObjectData.conid });
  $: driver = findEngineDriver($connection, $extensions);

  const tabVisible: any = getContext('tabVisible');

  export const activator = createActivator('SqlObjectTab', false);

  let domEditor;
  let domToolStrip;

  $: if ($tabVisible && domEditor) {
    domEditor?.getEditor()?.focus();
  }

  export function find() {
    domEditor.getEditor().execCommand('find');
  }

  function createMenu() {
    return [{ command: 'sqlObject.find' }];
  }
</script>

<ToolStripContainer>
  {#await applyScriptTemplate(scriptTemplate ?? defaultScriptTemplate, $extensions, appObjectData)}
    <LoadingInfo message="Loading script..." />
  {:then sql}
    <AceEditor
      value={sql || ''}
      readOnly
      menu={createMenu()}
      on:focus={() => {
        activator.activate();
        domToolStrip?.activate();
        invalidateCommands();
      }}
      bind:this={domEditor}
      mode={driver?.editorMode || 'sql'}
    />
  {/await}

  <svelte:fragment slot="toolstrip">
    <SelectField
      isNative
      value={scriptTemplate ?? defaultScriptTemplate}
      options={getSupportedScriptTemplates(appObjectData.objectTypeField).map(x => ({
        label: x.label,
        value: x.scriptTemplate,
      }))}
      on:change={e => {
        changeTab(tabid, tab => ({
          ...tab,
          props: {
            ...tab.props,
            scriptTemplate: e.detail,
          },
        }));
      }}
    />
  </svelte:fragment>
</ToolStripContainer>
