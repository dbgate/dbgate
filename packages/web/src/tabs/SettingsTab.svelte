<script>
  import HorizontalSplitter from "../elements/HorizontalSplitter.svelte";
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
        isProApp() && {
            label: _t('settings.license', { defaultMessage: 'License' }),
            identifier: 'license',
            component: LicenseSettings,
            props: {},
            testid: 'settings-license',
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