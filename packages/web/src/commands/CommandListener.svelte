<script lang="ts" context="module">
  import { commandsCustomized, visibleCommandPalette } from '../stores';
  import { get } from 'svelte/store';
  import { runGroupCommand } from './runCommand';

  export function handleCommandKeyDown(e) {
    let keyText = '';
    if (e.ctrlKey) keyText += 'Ctrl+';
    if (e.shiftKey) keyText += 'Shift+';
    if (e.altKey) keyText += 'Alt+';
    keyText += e.key;

    // console.log('keyText', keyText);

    const commandsValue = get(commandsCustomized);
    const commandsFiltered: any = Object.values(commandsValue).filter(
      (x: any) =>
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

    if (commandsFiltered.length > 0) {
      e.preventDefault();
      e.stopPropagation();
    }

    const notGroup = commandsFiltered.filter(x => x.enabled && !x.isGroupCommand);
    if (notGroup.length == 1) {
      const command = notGroup[0];
      if (command.onClick) command.onClick();
      else if (command.getSubCommands) visibleCommandPalette.set(command);
      return;
    }

    const group = commandsFiltered.filter(x => x.enabled && x.isGroupCommand);

    if (group.length == 1) {
      const command = group[0];
      runGroupCommand(command.group);
    }
  }
</script>

<svelte:window on:keydown={handleCommandKeyDown} />
