<script lang="ts">
  import JsonCellView from './JsonCellView.svelte';
  export let selection;
</script>

<JsonCellView {selection} expandAll />
