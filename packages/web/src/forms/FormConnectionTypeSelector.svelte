<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import FormSelectFieldRaw from './FormSelectFieldRaw.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import openNewTab from '../utility/openNewTab';
  import { openedTabs } from '../stores';

  export let label;
  export let name;
  export let options;
  export let templateProps = {};

  const { template } = getFormContext();

  function handleOpenDriverSettings() {
    // Check if SettingsTab is already open
    const existingSettingsTab = $openedTabs.find(tab => tab.tabComponent === 'SettingsTab' && !tab.closedTime);

    if (existingSettingsTab) {
      openedTabs.update(tabs =>
        tabs.map(tab =>
          tab.tabid === existingSettingsTab.tabid
            ? { ...tab, selected: true, props: { ...tab.props, selectedItem: 'drivers' } }
            : { ...tab, selected: false }
        )
      );
    } else {
      openNewTab({
        title: 'Settings',
        icon: 'icon settings',
        tabComponent: 'SettingsTab',
        props: {
          selectedItem: 'drivers',
        },
      });
    }
  }
</script>

<svelte:component this={template} type="select" {label} {...templateProps}>
  <div class="flex">
    <FormSelectFieldRaw {name} {options} defaultSelectValue={undefined} {...$$restProps} on:change />
    <InlineButton on:click={handleOpenDriverSettings} useBorder>...</InlineButton>
  </div>
</svelte:component>
