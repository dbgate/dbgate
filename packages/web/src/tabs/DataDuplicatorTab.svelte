<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('DataDuplicatorTab');

  registerCommand({
    id: 'dataDuplicator.run',
    category: 'Data duplicator',
    name: 'Import into DB',
    keyText: 'F5 | CtrlOrCommand+Enter',
    toolbar: true,
    isRelatedToTab: true,
    icon: 'icon run',
    testEnabled: () => getCurrentEditor()?.canRun(),
    onClick: () => getCurrentEditor().run(),
  });
  registerCommand({
    id: 'dataDuplicator.kill',
    category: 'Data duplicator',
    icon: 'icon close',
    name: 'Kill',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor()?.canKill(),
    onClick: () => getCurrentEditor().kill(),
  });
  registerCommand({
    id: 'dataDuplicator.generateScript',
    category: 'Data duplicator',
    icon: 'img shell',
    name: 'Generate Script',
    toolbar: true,
    isRelatedToTab: true,
    testEnabled: () => getCurrentEditor()?.canRun(),
    onClick: () => getCurrentEditor().generateScript(),
  });
</script>

<script lang="ts">
  import { ScriptWriter, ScriptWriterJson } from 'dbgate-tools';

  import _ from 'lodash';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import invalidateCommands from '../commands/invalidateCommands';
  import registerCommand from '../commands/registerCommand';
  import Link from '../elements/Link.svelte';
  import ObjectConfigurationControl from '../elements/ObjectConfigurationControl.svelte';
  import TableControl from '../elements/TableControl.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { extractShellConnection } from '../impexp/createImpExpScript';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import useEditorData from '../query/useEditorData';
  import { getCurrentConfig } from '../stores';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import { changeTab } from '../utility/common';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { useArchiveFiles, useArchiveFolders, useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import openNewTab from '../utility/openNewTab';
  import useEffect from '../utility/useEffect';
  import useTimerLabel from '../utility/useTimerLabel';
  import appObjectTypes from '../appobj';

  export let conid;
  export let database;
  export let tabid;

  let busy = false;
  let runnerId = null;
  let executeNumber = 0;

  export const activator = createActivator('DataDuplicatorTab', true);

  const timerLabel = useTimerLabel();

  $: connection = useConnectionInfo({ conid });
  $: dbinfo = useDatabaseInfo({ conid, database });

  $: archiveFolders = useArchiveFolders();
  $: archiveFiles = useArchiveFiles({ folder: $editorState?.value?.archiveFolder });

  $: pairedNames = _.sortBy(
    _.intersectionBy(
      $dbinfo?.tables?.map(x => x.pureName),
      $archiveFiles?.map(x => x.name),
      (x: string) => _.toUpper(x)
    )
  );

  $: {
    changeTab(tabid, tab => ({ ...tab, busy }));
  }

  $: {
    busy;
    runnerId;
    tableRows;
    invalidateCommands();
  }

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    onInitialData: value => {
      invalidateCommands();
    },
  });

  function changeTable(row) {
    setEditorData(old => ({
      ...old,
      tables: {
        ...old?.tables,
        [row.name]: row,
      },
    }));
  }

  function createScript(forceScript = false) {
    const config = getCurrentConfig();
    const script = config.allowShellScripting || forceScript ? new ScriptWriter() : new ScriptWriterJson();
    script.dataDuplicator({
      connection: extractShellConnection($connection, database),
      archive: $editorState.value.archiveFolder,
      items: tableRows
        .filter(x => x.isChecked)
        .map(row => ({
          name: row.name,
          operation: row.operation,
          matchColumns: _.compact([row.matchColumn1]),
        })),
      options: {
        rollbackAfterFinish: !!$editorState.value?.rollbackAfterFinish,
        skipRowsWithUnresolvedRefs: !!$editorState.value?.skipRowsWithUnresolvedRefs,
        setNullForUnresolvedNullableRefs: !!$editorState.value?.setNullForUnresolvedNullableRefs,
      },
    });
    return script.getScript();
  }

  export function canRun() {
    return !!tableRows.find(x => x.isChecked) && !busy;
  }

  export async function run() {
    if (busy) return;
    executeNumber += 1;
    busy = true;
    const script = await createScript();
    let runid = runnerId;
    const resp = await apiCall('runners/start', { script });
    runid = resp.runid;
    runnerId = runid;
    timerLabel.start();
  }

  export async function generateScript() {
    const code = await createScript();
    openNewTab(
      {
        title: 'Shell #',
        icon: 'img shell',
        tabComponent: 'ShellTab',
      },
      { editor: code }
    );
  }

  $: effect = useEffect(() => registerRunnerDone(runnerId));

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

  $: $effect;

  const handleRunnerDone = () => {
    busy = false;
    timerLabel.stop();
  };

  export function canKill() {
    return busy;
  }

  export function kill() {
    apiCall('runners/cancel', {
      runid: runnerId,
    });
    timerLabel.stop();
  }

  // $: console.log('$archiveFiles', $archiveFiles);
  // $: console.log('$editorState', $editorState.value);

  $: tableRows = pairedNames.map(name => {
    const item = $editorState?.value?.tables?.[name];
    const isChecked = item?.isChecked ?? true;
    const operation = item?.operation ?? 'copy';
    const tableInfo = $dbinfo?.tables?.find(x => x.pureName?.toUpperCase() == name.toUpperCase());
    const matchColumn1 =
      item?.matchColumn1 ?? tableInfo?.primaryKey?.columns?.[0]?.columnName ?? tableInfo?.columns?.[0]?.columnName;

    return {
      name,
      isChecked,
      operation,
      matchColumn1,
      file: name,
      table: tableInfo?.schemaName ? `${tableInfo?.schemaName}.${tableInfo?.pureName}` : tableInfo?.pureName,
      schemaName: tableInfo?.schemaName,
      pureName: tableInfo?.pureName,
      tableInfo,
    };
  });

  // $: console.log('$archiveFolders', $archiveFolders);

  const changeCheckStatus = isChecked => () => {
    setEditorData(old => {
      const tables = { ...old?.tables };
      for (const table of pairedNames) {
        tables[table] = {
          ...old?.tables?.[table],
          isChecked,
        };
      }
      return {
        ...old,
        tables,
      };
    });
  };
</script>

<ToolStripContainer>
  <VerticalSplitter initialValue="70%">
    <svelte:fragment slot="1">
      <div class="wrapper">
        <ObjectConfigurationControl title="Configuration">
          <FormFieldTemplateLarge label="Source archive" type="combo">
            <SelectField
              isNative
              value={$editorState.value?.archiveFolder}
              on:change={e => {
                setEditorData(old => ({
                  ...old,
                  archiveFolder: e.detail,
                }));
              }}
              options={$archiveFolders?.map(x => ({
                label: x.name,
                value: x.name,
              })) || []}
            />
          </FormFieldTemplateLarge>

          <FormFieldTemplateLarge
            label="Dry run - no changes (rollback when finished)"
            type="checkbox"
            labelProps={{
              onClick: () => {
                setEditorData(old => ({
                  ...old,
                  rollbackAfterFinish: !$editorState.value?.rollbackAfterFinish,
                }));
              },
            }}
          >
            <CheckboxField
              checked={$editorState.value?.rollbackAfterFinish}
              on:change={e => {
                setEditorData(old => ({
                  ...old,
                  rollbackAfterFinish: e.target.checked,
                }));
              }}
            />
          </FormFieldTemplateLarge>

          <FormFieldTemplateLarge
            label="Skip rows with unresolved mandatory references"
            type="checkbox"
            labelProps={{
              onClick: () => {
                setEditorData(old => ({
                  ...old,
                  skipRowsWithUnresolvedRefs: !$editorState.value?.skipRowsWithUnresolvedRefs,
                }));
              },
            }}
          >
            <CheckboxField
              checked={$editorState.value?.skipRowsWithUnresolvedRefs}
              on:change={e => {
                setEditorData(old => ({
                  ...old,
                  skipRowsWithUnresolvedRefs: e.target.checked,
                }));
              }}
            />
          </FormFieldTemplateLarge>

          <FormFieldTemplateLarge
            label="Set NULL for nullable unresolved references"
            type="checkbox"
            labelProps={{
              onClick: () => {
                setEditorData(old => ({
                  ...old,
                  setNullForUnresolvedNullableRefs: !$editorState.value?.setNullForUnresolvedNullableRefs,
                }));
              },
            }}
          >
            <CheckboxField
              checked={$editorState.value?.setNullForUnresolvedNullableRefs}
              on:change={e => {
                setEditorData(old => ({
                  ...old,
                  setNullForUnresolvedNullableRefs: e.target.checked,
                }));
              }}
            />
          </FormFieldTemplateLarge>
        </ObjectConfigurationControl>

        <ObjectConfigurationControl title="Imported files">
          <div class="mb-2">
            <Link onClick={changeCheckStatus(true)}>Check all</Link>
            |
            <Link onClick={changeCheckStatus(false)}>Uncheck all</Link>
          </div>

          <TableControl
            rows={tableRows}
            columns={[
              { header: '', fieldName: 'isChecked', slot: 1 },
              { header: 'Source file', fieldName: 'file', slot: 4 },
              { header: 'Target table', fieldName: 'table', slot: 5 },
              { header: 'Operation', fieldName: 'operation', slot: 2 },
              { header: 'Match column', fieldName: 'matchColumn1', slot: 3 },
            ]}
          >
            <svelte:fragment slot="1" let:row>
              <CheckboxField
                checked={row.isChecked}
                on:change={e => {
                  changeTable({ ...row, isChecked: e.target.checked });
                }}
              />
            </svelte:fragment>
            <svelte:fragment slot="2" let:row>
              <SelectField
                isNative
                value={row.operation}
                on:change={e => {
                  changeTable({ ...row, operation: e.detail });
                }}
                disabled={!row.isChecked}
                options={[
                  { label: 'Copy row', value: 'copy' },
                  { label: 'Lookup (find matching row)', value: 'lookup' },
                  { label: 'Insert if not exists', value: 'insertMissing' },
                ]}
              />
            </svelte:fragment>
            <svelte:fragment slot="3" let:row>
              {#if row.operation != 'copy'}
                <SelectField
                  isNative
                  value={row.matchColumn1}
                  on:change={e => {
                    changeTable({ ...row, matchColumn1: e.detail });
                  }}
                  disabled={!row.isChecked}
                  options={$dbinfo?.tables
                    ?.find(x => x.pureName?.toUpperCase() == row.name.toUpperCase())
                    ?.columns?.map(col => ({
                      label: col.columnName,
                      value: col.columnName,
                    })) || []}
                />
              {/if}
            </svelte:fragment>
            <svelte:fragment slot="4" let:row>
              <Link
                onClick={() => {
                  openNewTab({
                    title: row.file,
                    icon: 'img archive',
                    tooltip: `${$editorState.value?.archiveFolder}\n${row.file}`,
                    tabComponent: 'ArchiveFileTab',
                    props: {
                      archiveFile: row.file,
                      archiveFolder: $editorState.value?.archiveFolder,
                    },
                  });
                }}><FontIcon icon="img archive" /> {row.file}</Link
              >
            </svelte:fragment>
            <svelte:fragment slot="5" let:row>
              <Link
                menu={appObjectTypes.DatabaseObjectAppObject.createAppObjectMenu({ ...row.tableInfo, conid, database })}
                onClick={() => {
                  openNewTab({
                    title: row.pureName,
                    icon: 'img table',
                    tabComponent: 'TableDataTab',
                    props: {
                      schemaName: row.schemaName,
                      pureName: row.pureName,
                      conid,
                      database,
                      objectTypeField: 'tables',
                    },
                  });
                }}><FontIcon icon="img table" /> {row.table}</Link
              >
            </svelte:fragment>
          </TableControl>
        </ObjectConfigurationControl>
      </div>
    </svelte:fragment>
    <svelte:fragment slot="2">
      <SocketMessageView
        eventName={runnerId ? `runner-info-${runnerId}` : null}
        {executeNumber}
        showNoMessagesAlert
        showCaller
      />
    </svelte:fragment>
  </VerticalSplitter>

  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="dataDuplicator.run" />
    <ToolStripCommandButton command="dataDuplicator.kill" />
    <ToolStripCommandButton command="dataDuplicator.generateScript" />
  </svelte:fragment>
</ToolStripContainer>

<!-- <div>
  {#each pairedNames as name}
    <div>{name}</div>
  {/each}
</div> -->

<!-- <style>
    .title {
        font-weight: bold;
    }
</style> -->
<style>
  .wrapper {
    overflow-y: auto;
    background-color: var(--theme-bg-0);
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
