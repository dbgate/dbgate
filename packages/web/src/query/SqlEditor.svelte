<script lang="ts" context="module">
  const engineToMode = {
    mssql: 'sqlserver',
    mysql: 'mysql',
    postgre: 'pgsql',
  };
</script>

<script lang="ts">
  import AceEditor from './AceEditorCore.svelte';
  export let engine;

  $: console.log('engine', engine);
</script>

<AceEditor mode={engineToMode[engine] || 'sql'} />
