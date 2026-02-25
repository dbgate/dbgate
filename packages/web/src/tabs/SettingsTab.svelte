<script lang="ts" context="module">
  export const matchingProps = [];
</script>

<script lang="ts">
  import SettingsMenuControl from '../elements/SettingsMenuControl.svelte';
  import GeneralSettings from '../settings/GeneralSettings.svelte';
  import SettingsFormProvider from '../forms/SettingsFormProvider.svelte';
  import ConnectionSettings from '../settings/ConnectionSettings.svelte';
  import DriverSettings from '../settings/DriverSettings.svelte';
  import ThemeSettings from '../settings/ThemeSettings.svelte';
  import DefaultActionsSettings from '../settings/DefaultActionsSettings.svelte';
  import BehaviourSettings from '../settings/BehaviourSettings.svelte';
  import ExternalToolsSettings from '../settings/ExternalToolsSettings.svelte';
  import LicenseSettings from '../settings/LicenseSettings.svelte';
  import { isProApp } from '../utility/proTools';
  import { _t } from '../translations';
  import CommandListTab from './CommandListTab.svelte';
  import DataGridSettings from '../settings/DataGridSettings.svelte';
  import SQLEditorSettings from '../settings/SQLEditorSettings.svelte';
  import AiSettingsTab from '../settings/AiSettingsTab.svelte';
  import hasPermission from '../utility/hasPermission';
  import { openedTabs } from '../stores';

  export let selectedItem = 'general';
  export let tabid = null;

  function handleUserChange(value) {
    if (value === selectedItem) return;
    if (!tabid) return;

    openedTabs.update(tabs =>
      tabs.map(tab => (tab.tabid === tabid ? { ...tab, props: { ...tab.props, selectedItem: value } } : tab))
    );
  }

  const menuItems = [
    {
      label: _t('settings.general', { defaultMessage: 'General' }),
      identifier: 'general',
      component: GeneralSettings,
      props: {},
      testid: 'settings-general',
    },
    hasPermission('settings/change') && {
      label: _t('settings.connection', { defaultMessage: 'Connection' }),
      identifier: 'connection',
      component: ConnectionSettings,
      props: {},
      testid: 'settings-connection',
    },
    hasPermission('settings/change') && {
      label: _t('settings.dataGrid.title', { defaultMessage: 'Data grid' }),
      identifier: 'data-grid',
      component: DataGridSettings,
      props: {},
      testid: 'settings-data-grid',
    },
    hasPermission('settings/change') && {
      label: _t('settings.sqlEditor.title', { defaultMessage: 'SQL Editor' }),
      identifier: 'sql-editor',
      component: SQLEditorSettings,
      props: {},
      testid: 'settings-sql-editor',
    },
    {
      label: _t('settings.theme', { defaultMessage: 'Themes' }),
      identifier: 'theme',
      component: ThemeSettings,
      props: { tabid },
      testid: 'settings-themes',
    },
    hasPermission('settings/change') && {
      label: _t('settings.defaultActions', { defaultMessage: 'Default Actions' }),
      identifier: 'default-actions',
      component: DefaultActionsSettings,
      props: {},
      testid: 'settings-default-actions',
    },
    hasPermission('settings/change') && {
      label: _t('settings.behaviour', { defaultMessage: 'Behaviour' }),
      identifier: 'behaviour',
      component: BehaviourSettings,
      props: {},
      testid: 'settings-behaviour',
    },
    hasPermission('settings/change') && {
      label: _t('settings.externalTools', { defaultMessage: 'External Tools' }),
      identifier: 'external-tools',
      component: ExternalToolsSettings,
      props: {},
      testid: 'settings-external-tools',
    },
    hasPermission('settings/change') && {
      label: _t('settings.drivers', { defaultMessage: 'Drivers' }),
      identifier: 'drivers',
      component: DriverSettings,
      props: {},
      testid: 'settings-drivers',
    },
    hasPermission('settings/change') && {
      label: _t('command.settings.shortcuts', { defaultMessage: 'Keyboard shortcuts' }),
      identifier: 'shortcuts',
      component: CommandListTab,
      props: {},
      testid: 'settings-shortcuts',
    },
    hasPermission('settings/change') &&
      isProApp() && {
        label: _t('settings.license', { defaultMessage: 'License' }),
        identifier: 'license',
        component: LicenseSettings,
        props: {},
        testid: 'settings-license',
      },
    hasPermission('settings/change') &&
      isProApp() && {
        label: _t('settings.AI', { defaultMessage: 'AI' }),
        identifier: 'ai',
        component: AiSettingsTab,
        props: {},
        testid: 'settings-ai',
      },
  ];
</script>

<SettingsFormProvider>
  <SettingsMenuControl
    items={menuItems}
    bind:value={selectedItem}
    flex1={true}
    flexColContainer={true}
    scrollableContentContainer={true}
    onUserChange={handleUserChange}
  />
</SettingsFormProvider>
