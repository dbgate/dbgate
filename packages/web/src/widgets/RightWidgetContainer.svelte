<script lang="ts">
  import { rightPanelWidget } from '../stores';
  import hasPermission from '../utility/hasPermission';
  import { isProApp } from '../utility/proTools';
  import ThemeAiAssistantWidget from '../ai/ThemeAiAssistantWidget.svelte';
</script>

{#if $rightPanelWidget == 'themeAiAssistant' && hasPermission('widgets/themeAiAssistant') && isProApp()}
  <ThemeAiAssistantWidget />
{/if}
