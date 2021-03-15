<script lang="ts" context="module">
  import { commands } from '../stores';
  import { get } from 'svelte/store';
  
  export function handleCommandKeyDown(e) {
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
        !x.isGroupCommand &&
        x.keyText &&
        x.keyText
          .toLowerCase()
          .split('|')
          .map(x => x.trim())
          .includes(keyText.toLowerCase()) &&
        (x.disableHandleKeyText == null ||
          !x.disableHandleKeyText
            .toLowerCase()
            .split('|')
            .map(x => x.trim())
            .includes(keyText.toLowerCase()))
    );

    if (command) {
      e.preventDefault();
      e.stopPropagation();
      command.onClick();
    }
  }
</script>

<svelte:window on:keydown={handleCommandKeyDown} />
