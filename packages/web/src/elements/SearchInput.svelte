<script lang="ts">
  import keycodes from '../utility/keycodes';

  export let placeholder;
  export let value;

  let domInput;

  function handleKeyDown(e) {
    if (e.keyCode == keycodes.escape) {
      value = '';
    }
  }
</script>

<input
  type="text"
  {placeholder}
  bind:value
  on:keydown={handleKeyDown}
  bind:this={domInput}
  on:focus={e => domInput.select()}
/>

<style>
  input {
    flex: 1;
    min-width: 10px;
    width: 10px;
    border: none;
  }
</style>
