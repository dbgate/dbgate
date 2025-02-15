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

  export const matchingProps = ['conid', 'database', 'schemaName', 'pureName', 'objectTypeField'];
</script>

<script lang="ts">
  import { getContext } from 'svelte';

  import AceEditor from '../query/AceEditor.svelte';
  import invalidateCommands from '../commands/invalidateCommands';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import { extensions, lastUsedDefaultActions } from '../stores';
  import { findEngineDriver } from 'dbgate-tools';
  import registerCommand from '../commands/registerCommand';
  import applyScriptTemplate, { getSupportedScriptTemplates } from '../utility/applyScriptTemplate';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import { changeTab } from '../utility/common';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import openNewTab from '../utility/openNewTab';
  import { getBoolSettingsValue } from '../settings/settingsTools';

  export let tabid;
  export let appObjectData;
  export let scriptTemplate;

  export let schemaName;
  export let pureName;
  export let conid;
  export let database;
  export let objectTypeField;
  export let tabPreviewMode;

  $: appObjectData = {
    schemaName,
    pureName,
    conid,
    database,
    objectTypeField,
  };

  $: defaultScriptTemplate = getSupportedScriptTemplates(appObjectData.objectTypeField)?.[0]?.scriptTemplate;

  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);
  $: dbinfo = useDatabaseInfo({ conid, database });

  const tabFocused: any = getContext('tabFocused');

  export const activator = createActivator('SqlObjectTab', false);

  let domEditor;
  let domToolStrip;

  $: if ($tabFocused && domEditor) {
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
  {#await applyScriptTemplate(scriptTemplate ?? defaultScriptTemplate, $extensions, appObjectData, $dbinfo, $connection)}
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
    {#if objectTypeField == 'tables' || objectTypeField == 'views' || objectTypeField == 'matviews'}
      <ToolStripButton
        icon="icon structure"
        iconAfter="icon arrow-link"
        on:click={() => {
          if (tabPreviewMode && getBoolSettingsValue('defaultAction.useLastUsedAction', true)) {
            lastUsedDefaultActions.update(actions => ({
              ...actions,
              [objectTypeField]: 'openStructure',
            }));
          }

          openNewTab({
            title: pureName,
            icon: 'img table-structure',
            tabComponent: 'TableStructureTab',
            tabPreviewMode: true,
            props: {
              schemaName,
              pureName,
              conid,
              database,
              objectTypeField,
              defaultActionId: 'openStructure',
            },
          });
        }}>Structure</ToolStripButton
      >
      <ToolStripButton
        icon="icon table"
        iconAfter="icon arrow-link"
        on:click={() => {
          if (tabPreviewMode && getBoolSettingsValue('defaultAction.useLastUsedAction', true)) {
            lastUsedDefaultActions.update(actions => ({
              ...actions,
              [objectTypeField]: 'openTable',
            }));
          }

          openNewTab({
            title: pureName,
            icon: objectTypeField == 'tables' ? 'img table' : 'img view',
            tabComponent: objectTypeField == 'tables' ? 'TableDataTab' : 'ViewDataTab',
            objectTypeField,
            tabPreviewMode: true,
            props: {
              schemaName,
              pureName,
              conid,
              database,
              objectTypeField,
              defaultActionId: 'openTable',
            },
          });
        }}>Data</ToolStripButton
      >
    {/if}

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
    {#each getSupportedScriptTemplates(appObjectData.objectTypeField) as template}
      <ToolStripButton
        icon="img sql-file"
        on:click={() => {
          openNewTab({
            title: 'Query #',
            icon: 'img sql-file',
            tabComponent: 'QueryTab',
            objectTypeField: appObjectData.objectTypeField,
            focused: true,
            props: {
              conid,
              database,
              schemaName,
              pureName,
              objectTypeField,
              initialArgs: { scriptTemplate: template.scriptTemplate },
            },
          });
        }}>{template.label}</ToolStripButton
      >
    {/each}
  </svelte:fragment>
</ToolStripContainer>
