import { getCommands, visibleCommandPalette } from '../stores';
import type { GlobalCommand } from './registerCommand';

export default function runCommand(id) {
  const commandsValue = getCommands();
  const command = commandsValue[id];
  if (command) {
    if (!command.enabled) return;
    if (command.isGroupCommand) {
      runGroupCommand(command.group);
    } else {
      if (command.onClick) {
        command.onClick();
      } else if (command.getSubCommands) {
        visibleCommandPalette.set(command);
      }
    }
  }
}

export function runGroupCommand(group) {
  const commandsValue = getCommands();
  const values = Object.values(commandsValue) as GlobalCommand[];
  const real = values.find(x => x.group == group && !x.isGroupCommand && x.enabled);
  if (real && real.onClick) real.onClick();
}

export function findCommand(id) {
  const commandsValue = getCommands();
  const command = commandsValue[id];
  return command;
}

