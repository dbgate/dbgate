<script lang="ts" context="module">
  export const matchingProps = [];
</script>

<script lang="ts">
  import SettingsMenuControl from "../elements/SettingsMenuControl.svelte";
  import GeneralSettings from "../settings/GeneralSettings.svelte";
  import SettingsFormProvider from "../forms/SettingsFormProvider.svelte";
  import ConnectionSettings from "../settings/ConnectionSettings.svelte";
  import ThemeSettings from "../settings/ThemeSettings.svelte";
  import DefaultActionsSettings from "../settings/DefaultActionsSettings.svelte";
  import BehaviourSettings from "../settings/BehaviourSettings.svelte";
  import ExternalToolsSettings from "../settings/ExternalToolsSettings.svelte";
  import OtherSettings from "../settings/OtherSettings.svelte";
  import LicenseSettings from "../settings/LicenseSettings.svelte";
  import { isProApp } from "../utility/proTools";
  import { _t } from "../translations";
  import CommandListTab from "./CommandListTab.svelte";
  import DataGridSettings from "../settings/DataGridSettings.svelte";
    import SQLEditorSettings from "../settings/SQLEditorSettings.svelte";
    import AiSettingsTab from "../settings/AiSettingsTab.svelte";

    const menuItems = [
        {
            label: _t('settings.general', { defaultMessage: 'General' }),
            identifier: 'general',
            component: GeneralSettings,
            props: {},
            testid: 'settings-general',
        },
        {
            label: _t('settings.connection', { defaultMessage: 'Connection' }),
            identifier: 'connection',
            component: ConnectionSettings,
            props: {},
            testid: 'settings-connection',
        },
        {
            label: _t('settings.dataGrid.title', { defaultMessage: 'Data grid' }),
            identifier: 'data-grid',
            component: DataGridSettings,
            props: {},
            testid: 'settings-data-grid',
        },
        {
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
            props: {},
            testid: 'settings-themes',
        },
        {
            label: _t('settings.defaultActions', { defaultMessage: 'Default Actions' }),
            identifier: 'default-actions',
            component: DefaultActionsSettings,
            props: {},
            testid: 'settings-default-actions',
        },
        {
            label: _t('settings.behaviour', { defaultMessage: 'Behaviour' }),
            identifier: 'behaviour',
            component: BehaviourSettings,
            props: {},
            testid: 'settings-behaviour',
        },
        {
            label: _t('settings.externalTools', { defaultMessage: 'External Tools' }),
            identifier: 'external-tools',
            component: ExternalToolsSettings,
            props: {},
            testid: 'settings-external-tools',
        },
        {
            label: _t('command.settings.shortcuts', { defaultMessage: 'Keyboard shortcuts' }),
            identifier: 'shortcuts',
            component: CommandListTab,
            props: {},
            testid: 'settings-shortcuts',
        },
        isProApp() && {
            label: _t('settings.license', { defaultMessage: 'License' }),
            identifier: 'license',
            component: LicenseSettings,
            props: {},
            testid: 'settings-license',
        },
        isProApp() && {
            label: _t('settings.AI', { defaultMessage: 'AI'}),
            identifier: 'ai',
            component: AiSettingsTab,
            props: {},
            testid: 'settings-ai',
        },
        {
            label: _t('settings.other', { defaultMessage: 'Other' }),
            identifier: 'other',
            component: OtherSettings,
            props: {},
            testid: 'settings-other',
        },
    ];

    let selectedItem = 'general';
</script>

<SettingsFormProvider>
  <SettingsMenuControl 
      items={menuItems}
      bind:value={selectedItem}
      flex1={true}
      flexColContainer={true}
      scrollableContentContainer={true}
  />
</SettingsFormProvider>