<script lang="ts">
  import TextCellView from './TextCellView.svelte';
  export let selection;
</script>

<TextCellView wrap="hard" {selection} />
