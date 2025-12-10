<script lang="ts">
  import { visibleSelectedWidget } from '../stores';
  import ArchiveWidget from './ArchiveWidget.svelte';
  import DatabaseWidget from './DatabaseWidget.svelte';
  import FilesWidget from './FilesWidget.svelte';
  import PluginsWidget from './PluginsWidget.svelte';
  import CellDataWidget from './CellDataWidget.svelte';
  import HistoryWidget from './HistoryWidget.svelte';
  import AdminMenuWidget from './AdminMenuWidget.svelte';
  import AdminPremiumPromoWidget from './AdminPremiumPromoWidget.svelte';
  import PublicCloudWidget from './PublicCloudWidget.svelte';
  import PrivateCloudWidget from './PrivateCloudWidget.svelte';
  import hasPermission from '../utility/hasPermission';
</script>

{#if hasPermission('widgets/database')}
  <DatabaseWidget hidden={$visibleSelectedWidget != 'database'} />
{/if}
{#if $visibleSelectedWidget == 'file' && hasPermission('widgets/file')}
  <FilesWidget />
{/if}
{#if $visibleSelectedWidget == 'history' && hasPermission('widgets/history')}
  <HistoryWidget />
{/if}
{#if $visibleSelectedWidget == 'archive' && hasPermission('widgets/archive')}
  <ArchiveWidget />
{/if}
{#if $visibleSelectedWidget == 'plugins' && hasPermission('widgets/plugins')}
  <PluginsWidget />
{/if}
{#if $visibleSelectedWidget == 'cell-data' && hasPermission('widgets/cell-data')}
  <CellDataWidget />
{/if}
{#if $visibleSelectedWidget == 'admin' && hasPermission('widgets/admin')}
  <AdminMenuWidget />
{/if}
{#if $visibleSelectedWidget == 'premium'}
  <AdminPremiumPromoWidget />
{/if}
{#if $visibleSelectedWidget == 'cloud-public' && hasPermission('widgets/cloud-public')}
  <PublicCloudWidget />
{/if}
{#if $visibleSelectedWidget == 'cloud-private' && hasPermission('widgets/cloud-private')}
  <PrivateCloudWidget />
{/if}
