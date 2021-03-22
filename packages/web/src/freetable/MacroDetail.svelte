<script lang="ts">
  import { getContext } from 'svelte';

  import TabControl from '../elements/TabControl.svelte';
  import AceEditor from '../query/AceEditor.svelte';

  import MacroHeader from './MacroHeader.svelte';
  import MacroInfoTab from './MacroInfoTab.svelte';

  const selectedMacro = getContext('selectedMacro') as any;

  export let onExecute;
</script>

<div class="container">
  <MacroHeader {onExecute} />
  <TabControl
    tabs={[
      {
        label: 'Macro detail',
        component: MacroInfoTab,
        props: {
          onExecute,
        },
      },
      {
        label: 'JavaScript',
        component: AceEditor,
        props: {
          readOnly: true,
          value: $selectedMacro?.code,
          mode: 'javascript',
        },
      },
    ]}
  />
</div>

<style>
  .container {
    position: absolute;
    display: flex;
    flex-direction: column;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
</style>
