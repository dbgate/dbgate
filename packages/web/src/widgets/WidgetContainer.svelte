<script lang="ts">
  import { selectedWidget } from '../stores';
  import ArchiveWidget from './ArchiveWidget.svelte';
  import DatabaseWidget from './DatabaseWidget.svelte';
  import FilesWidget from './FilesWidget.svelte';
</script>

{#if $selectedWidget == 'database'}
  <DatabaseWidget />
{/if}
{#if $selectedWidget == 'file'}
  <FilesWidget />
{/if}
{#if $selectedWidget == 'archive'}
  <ArchiveWidget />
{/if}
