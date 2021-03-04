<script lang="ts">
  export let value;
</script>

<input type="text" {...$$restProps} bind:value on:change />
