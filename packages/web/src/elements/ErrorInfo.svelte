<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let message;
  export let icon = 'img error';
  export let isSmall = false;
  export let alignTop = false;
</script>

{#if isSmall}
  <div class="container-small">
    <FontIcon {icon} />
    {message || 'Unknown error'}
  </div>
{:else if alignTop}
  <div>
    <div class="container">
      <div class="icon">
        <FontIcon {icon} />
      </div>
      {message || 'Unknown error'}
    </div>
  </div>
{:else}
  <div class="container">
    <div class="icon">
      <FontIcon {icon} />
    </div>
    {message || 'Unknown error'}
  </div>
{/if}

<style>
  .container {
    display: flex;
    margin-right: 10px;
    align-items: center;
    overflow-wrap: anywhere;
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
