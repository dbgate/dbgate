<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let message;
  export let wrapper = false;
</script>

{#if wrapper}
  <div class="wrapper">
    <div class="box">
      <div class="container">
        <div class="spinner">
          <FontIcon icon="icon loading" />
        </div>
        {message}
      </div>
    </div>
  </div>
{:else}
  <div class="container">
    <div class="spinner">
      <FontIcon icon="icon loading" />
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

  .spinner {
    font-size: 20pt;
    margin: 10px;
  }
  .wrapper {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-around;
  }
  .box {
    background-color: var(--theme-bg-2);
    padding: 10px;
    border: 1px solid var(--theme-border);
  }
</style>
