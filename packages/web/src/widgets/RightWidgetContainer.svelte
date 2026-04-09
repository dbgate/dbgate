<script lang="ts">
  import { rightPanelWidget } from '../stores';
  import hasPermission from '../utility/hasPermission';
  import { isProApp } from '../utility/proTools';
  import { useSettings } from '../utility/metadataLoaders';
  import ThemeAiAssistantWidget from '../ai/ThemeAiAssistantWidget.svelte';

  const settings = useSettings();
</script>

{#if $rightPanelWidget == 'themeAiAssistant' && hasPermission('widgets/themeAiAssistant') && isProApp() && !$settings?.['storage.disableAiFeatures']}
  <ThemeAiAssistantWidget />
{/if}
