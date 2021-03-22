<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let message;
  export let icon = 'img error';
  export let isSmall = false;
</script>

{#if isSmall}
  <div class="container-small">
    <FontIcon {icon} />
    {message}
  </div>
{:else}
  <div class="container">
    <div class="icon">
      <FontIcon {icon} />
    </div>
    {message}
  </div>
{/if}

<style>
  .container {
    display: flex;
    align-items: center;
    margin-right: 10px;
  }
  .icon {
    font-size: 20pt;
    margin: 10px;
  }

  .container-small {
    display: flex;
    margin-right: 10px;
  }
</style>
