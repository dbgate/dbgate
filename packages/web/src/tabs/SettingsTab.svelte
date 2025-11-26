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

    const menuItems = [
        {
            label: 'General',
            identifier: 'general',
            component: GeneralSettings,
            props: {},
            testid: 'settings-general',
        },
        {
            label: 'Connection',
            identifier: 'connection',
            component: ConnectionSettings,
            props: {},
            testid: 'settings-connection',
        },
        {
            label: 'Themes',
            identifier: 'theme',
            component: ThemeSettings,
            props: {},
            testid: 'settings-themes',
        },
        {
            label: 'Default Actions',
            identifier: 'default-actions',
            component: DefaultActionsSettings,
            props: {},
            testid: 'settings-default-actions',
        },
        {
            label: 'Behaviour',
            identifier: 'behaviour',
            component: BehaviourSettings,
            props: {},
            testid: 'settings-behaviour',
        },
        {
            label: 'External Tools',
            identifier: 'external-tools',
            component: ExternalToolsSettings,
            props: {},
            testid: 'settings-external-tools',
        },
        isProApp() && {
            label: 'License',
            identifier: 'license',
            component: LicenseSettings,
            props: {},
            testid: 'settings-license',
        },
        {
            label: 'Other',
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