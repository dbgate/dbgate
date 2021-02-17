<script>
  import { selectedWidget } from '../stores';
  import DatabaseWidget from './DatabaseWidget.svelte';


</script>

{#if $selectedWidget == 'database'}
  <DatabaseWidget />
{/if}
