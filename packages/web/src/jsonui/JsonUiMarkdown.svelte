<script lang="ts">
  import Markdown from '../elements/Markdown.svelte';

  export let text: string;
</script>

<div>
  <Markdown source={text} />
</div>

<style>
  div {
    margin: 10px;
  }
</style>
