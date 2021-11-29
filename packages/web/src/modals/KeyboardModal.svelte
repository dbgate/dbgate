<script lang="ts">
  import _ from 'lodash';

  import TextField from '../forms/TextField.svelte';
  import keycodes from '../utility/keycodes';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let onChange;
  let value;

  function handleKeyDown(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.keyCode == keycodes.escape) {
      closeCurrentModal();
      return;
    }

    if (e.keyCode == keycodes.enter && value) {
      onChange(value);
      closeCurrentModal();
      return;
    }

    let keyText = '';
    if (e.ctrlKey) keyText += 'Ctrl+';
    if (e.shiftKey) keyText += 'Shift+';
    if (e.metaKey) keyText += 'Command+';
    if (e.altKey) keyText += 'Alt+';
    if (e.key != 'Control' && e.key != 'Alt' && e.key != 'Shift' && e.key != 'Meta') {
      keyText += _.upperFirst(e.key);
    }

    value = keyText;
  }
</script>

<ModalBase {...$$restProps} simple>
  <div class="mb-2">Show desired key combination and press ENTER</div>
  <div class="largeFormMarker">
    <TextField on:keydown={handleKeyDown} bind:value focused />
  </div>
</ModalBase>

<style>
</style>
