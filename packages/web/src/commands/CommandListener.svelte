<script lang="ts" context="module">
  import { commandsCustomized, visibleCommandPalette } from '../stores';
  import { get } from 'svelte/store';
  import { runGroupCommand } from './runCommand';
  import { isMac, resolveKeyText } from '../utility/common';

  export function handleCommandKeyDown(e) {
    let keyText = '';
    if (e.ctrlKey) keyText += 'Ctrl+';
    if (e.metaKey) keyText += 'Command+';
    if (e.shiftKey) keyText += 'Shift+';
    if (e.altKey) keyText += 'Alt+';
    keyText += e.key;

    // console.log('keyText', keyText);

    const commandsValue = get(commandsCustomized);
    let commandsFiltered: any = Object.values(commandsValue).filter(
      (x: any) =>
        x.keyText &&
        resolveKeyText(x.keyText)
          .toLowerCase()
          .split('|')
          .map(x => x.trim())
          .includes(keyText.toLowerCase()) &&
        (x.disableHandleKeyText == null ||
          !resolveKeyText(x.disableHandleKeyText)
            .toLowerCase()
            .split('|')
            .map(x => x.trim())
            .includes(keyText.toLowerCase()))
    );

    if (commandsFiltered.length > 0 && commandsFiltered.find(x => !x.systemCommand)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (
      commandsFiltered.length > 1 &&
      commandsFiltered.find(x => x.systemCommand) &&
      commandsFiltered.find(x => !x.systemCommand)
    ) {
      commandsFiltered = commandsFiltered.filter(x => !x.systemCommand);
    }

    if (commandsFiltered.every(x => x.systemCommand)) {
      return;
    }

    const notGroup = commandsFiltered.filter(x => x.enabled && !x.isGroupCommand);

    if (notGroup.length > 1) {
      console.log('Warning, multiple commands mapped to', keyText, notGroup);
    }

    if (notGroup.length == 1) {
      const command = notGroup[0];
      if (command.onClick) command.onClick();
      else if (command.getSubCommands) visibleCommandPalette.set(command);
      return;
    }

    const group = commandsFiltered.filter(x => x.enabled && x.isGroupCommand);

    if (group.length > 1) {
      console.log('Warning, multiple commands mapped to', keyText, group);
    }

    if (group.length == 1) {
      const command = group[0];
      runGroupCommand(command.group);
    }
  }
</script>

<svelte:window on:keydown={handleCommandKeyDown} />
