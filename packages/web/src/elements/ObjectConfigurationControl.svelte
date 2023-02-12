<script lang="ts">
  export let title;
</script>

<div class="wrapper">
  <div class="header">
    <span class="title mr-1">{title}</span>
  </div>
  <div class="body">
    <slot />
  </div>
</div>

<style>
  .wrapper {
    margin-bottom: 20px;
  }

  .header {
    background-color: var(--theme-bg-1);
    padding: 5px;
  }

  .title {
    font-weight: bold;
    margin-left: 5px;
  }

  .body {
    margin: 20px;
  }
</style>
