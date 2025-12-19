<script lang="ts">
  import JsonUiContentRenderer from '../jsonui/JsonUiContentRenderer.svelte';
  import { promoWidgetPreview } from '../stores';
  import { usePromoWidget } from '../utility/metadataLoaders';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  const promoWidget = usePromoWidget({});

  $: promoWidgetData = $promoWidgetPreview || $promoWidget;
</script>

<WidgetsInnerContainer>
  {#if promoWidgetData?.state == 'data'}
    <JsonUiContentRenderer blocks={promoWidgetData?.blocks} passProps={{ validTo: promoWidgetData?.validTo }} />
  {/if}
</WidgetsInnerContainer>

<style>
  h2 {
    text-align: center;
  }

  p {
    margin: 10px;
  }

  ul {
    margin: 10px;
    list-style: none;
    padding: 0;
  }

  li {
    position: relative;
    padding-left: 1rem;
    margin-bottom: 0.2rem;
  }

  li:before {
    content: '\F0E1E';
    font-family: 'Material Design Icons';
    color: var(--theme-icon-green);

    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
  }

  .center {
    text-align: center;
  }
</style>
