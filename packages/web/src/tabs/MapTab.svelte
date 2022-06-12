<script lang="ts">
  import MapView from '../elements/MapView.svelte';

  import useEditorData from '../query/useEditorData';

  export let tabid;
  let selection;

  useEditorData({
    tabid,
    onInitialData: value => {
      selection = value;
    },
  });
</script>

{#if selection}
  <MapView {selection} />
{/if}
