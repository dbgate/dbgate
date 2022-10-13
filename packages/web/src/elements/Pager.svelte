<script lang="ts">
  import InlineButton from '../buttons/InlineButton.svelte';
  import TextField from '../forms/TextField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { createEventDispatcher } from 'svelte';
  import keycodes from '../utility/keycodes';

  const dispatch = createEventDispatcher();

  export let skip;
  export let limit;

  function handleKeyDown(e) {
    if (e.keyCode == keycodes.enter) {
      e.preventDefault();
      e.stopPropagation();
      dispatch('load');
    }
  }
</script>

<div class="wrapper">
  <InlineButton
    on:click={() => {
      skip = parseInt(skip) - parseInt(limit);
      if (skip < 0) skip = 0;
      dispatch('load');
    }}
  >
    <FontIcon icon="icon arrow-left" />
  </InlineButton>
  <span class="label">Start:</span>
  <TextField type="number" bind:value={skip} on:blur={() => dispatch('load')} on:keydown={handleKeyDown} />
  <span class="label">Rows:</span>
  <TextField type="number" bind:value={limit} on:blur={() => dispatch('load')} on:keydown={handleKeyDown} />
  <InlineButton
    on:click={() => {
      skip = parseInt(skip) + parseInt(limit);
      dispatch('load');
    }}
  >
    <FontIcon icon="icon arrow-right" />
  </InlineButton>
</div>

<style>
  .wrapper :global(input) {
    width: 100px;
  }
  .wrapper {
    display: flex;
    align-items: center;
  }
  .label {
    margin-left: 5px;
    margin-right: 5px;
  }
</style>
