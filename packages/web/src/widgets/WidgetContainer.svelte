<script lang="ts">
  import { selectedWidget } from '../stores';
  import ArchiveWidget from './ArchiveWidget.svelte';
  import DatabaseWidget from './DatabaseWidget.svelte';
  import FilesWidget from './FilesWidget.svelte';
  import PluginsWidget from './PluginsWidget.svelte';
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
{#if $selectedWidget == 'plugins'}
  <PluginsWidget />
{/if}
