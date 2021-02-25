import { get } from 'svelte/store';
import { commands } from '../stores';
import { GlobalCommand } from './registerCommand';

export default function runCommand(commandId: string) {
  const commandsValue = get(commands);
  const command: GlobalCommand = commandsValue[commandId];
  if (command.enabled) command.onClick();
}
