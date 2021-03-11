<script lang="ts">
  import { selectedWidget } from '../stores';
  import DatabaseWidget from './DatabaseWidget.svelte';
  import FilesWidget from './FilesWidget.svelte';


</script>

{#if $selectedWidget == 'database'}
  <DatabaseWidget />
{/if}
{#if $selectedWidget == 'file'}
  <FilesWidget />
{/if}
