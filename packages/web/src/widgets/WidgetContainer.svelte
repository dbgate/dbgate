<script lang="ts">
  import { visibleSelectedWidget } from '../stores';
  import ArchiveWidget from './ArchiveWidget.svelte';
  import DatabaseWidget from './DatabaseWidget.svelte';
  import FilesWidget from './FilesWidget.svelte';
  import PluginsWidget from './PluginsWidget.svelte';
  import CellDataWidget from './CellDataWidget.svelte';
  import HistoryWidget from './HistoryWidget.svelte';
  import AppWidget from './AppWidget.svelte';
  import AdminMenuWidget from './AdminMenuWidget.svelte';
</script>

<DatabaseWidget hidden={$visibleSelectedWidget != 'database'} />

{#if $visibleSelectedWidget == 'file'}
  <FilesWidget />
{/if}
{#if $visibleSelectedWidget == 'history'}
  <HistoryWidget />
{/if}
{#if $visibleSelectedWidget == 'archive'}
  <ArchiveWidget />
{/if}
{#if $visibleSelectedWidget == 'plugins'}
  <PluginsWidget />
{/if}
{#if $visibleSelectedWidget == 'cell-data'}
  <CellDataWidget />
{/if}
{#if $visibleSelectedWidget == 'app'}
  <AppWidget />
{/if}
{#if $visibleSelectedWidget == 'admin'}
  <AdminMenuWidget />
{/if}
