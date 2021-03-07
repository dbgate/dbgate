<script lang="ts">
  import { commands } from '../stores';
  import { get } from 'svelte/store';

  function handleKeyDown(e) {
    let keyText = '';
    if (e.ctrlKey) keyText += 'Ctrl+';
    if (e.shiftKey) keyText += 'Shift+';
    if (e.altKey) keyText += 'Alt+';
    keyText += e.key;

    // console.log('keyText', keyText);

    const commandsValue = get(commands);
    const command: any = Object.values(commandsValue).find(
      (x: any) =>
        x.enabled &&
        x.keyText &&
        x.keyText
          .toLowerCase()
          .split('|')
          .map(x => x.trim())
          .includes(keyText.toLowerCase())
    );

    if (command) {
      e.preventDefault();
      command.onClick();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />
