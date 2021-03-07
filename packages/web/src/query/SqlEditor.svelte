<script lang="ts" context="module">
  const engineToMode = {
    mssql: 'sqlserver',
    mysql: 'mysql',
    postgres: 'pgsql',
  };
</script>

<script lang="ts">
  import AceEditor from './AceEditor.svelte';
  export let engine;
  let domEditor;

  let mode;

  $: {
    const match = (engine || '').match(/^([^@]*)@/);
    mode = engineToMode[match ? match[1] : engine] || 'sql';
  }

  export function getSelectedText() {
    return domEditor.getSelectedText()
  }
</script>

<AceEditor {mode} {...$$props} on:input on:focus on:blur bind:this={domEditor}/>
