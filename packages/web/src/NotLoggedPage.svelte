<script lang="ts">
  import { onMount } from 'svelte';
  
  onMount(() => {
    const removed = document.getElementById('starting_dbgate_zero');
    if (removed) removed.remove();
  });
</script>

<div class='title'>Sorry, you are not authorized to run DbGate</div>

<style>
  .title {
    font-size: x-large;
    margin-top: 20vh;
    text-align: center;
  }
</style>
