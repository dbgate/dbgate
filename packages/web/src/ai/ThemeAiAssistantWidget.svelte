<script lang="ts">
  import { rightPanelWidget } from '../stores';
  import { _t } from '../translations';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import WidgetsInnerContainer from '../widgets/WidgetsInnerContainer.svelte';
  import AiChatControl from './AiChatControl.svelte';

  let domAiChatControl;
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem
    title={_t('theme.AiAssistant', { defaultMessage: 'Theme AI Assistant' })}
    name="aiAssistant"
    altsidebar
    onClose={() => {
      $rightPanelWidget = null;
    }}
  >
    <WidgetsInnerContainer skipDefineWidth flexContainer>
      <AiChatControl bind:this={domAiChatControl} tabid="screen" assistantMode="themeAssistant" />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>
</WidgetColumnBar>
