<script lang="ts">
  export let text: string;
  export let level: 1|2|3|4|5|6 = 2;
  const tag = `h${level}` as keyof HTMLElementTagNameMap;
</script>

<svelte:element this={tag}>{text}</svelte:element>

<style>
h2 {
  text-align: center;
}
</style>