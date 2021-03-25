<script lang="ts">
  export let selection;
  export let wrap;
</script>

<textarea class="flex1" {wrap} readonly value={selection.map(cell => cell.value).join('\n')} />
