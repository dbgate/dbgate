<script lang="ts">
  import MapView from '../elements/MapView.svelte';

  import useEditorData from '../query/useEditorData';

  export let tabid;
  let geoJson;

  useEditorData({
    tabid,
    onInitialData: value => {
      geoJson = value;
    },
  });
</script>

{#if geoJson}
  <MapView {geoJson} />
{/if}
