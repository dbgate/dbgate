import { tick } from 'svelte';
import { commands } from '../stores';
import type { GlobalCommand } from './registerCommand';

let isInvalidated = false;

export default async function invalidateCommands() {
  if (isInvalidated) return;
  isInvalidated = true;
  await tick();

  isInvalidated = false;

  commands.update(dct => {
    let res = null;
    for (const command of Object.values(dct) as GlobalCommand[]) {
      if (command.isGroupCommand) continue;
      const { testEnabled } = command;
      let enabled = command.enabled;
      if (testEnabled) enabled = testEnabled();
      if (enabled != command.enabled) {
        if (!res) res = { ...dct };
        res[command.id].enabled = enabled;
      }
    }
    if (res) {
      const values = Object.values(res) as GlobalCommand[];
      // test enabled for group commands
      for (const command of values) {
        if (!command.isGroupCommand) continue;
        const groupSources = values.filter(x => x.group == command.group && !x.isGroupCommand && x.enabled);
        command.enabled = groupSources.length > 0;
        // for (const source of groupSources) {
        //   source.keyTextFromGroup = command.keyText;
        // }
      }
    }
    return res || dct;
  });
}

let isInvalidatedDefinitions = false;

export async function invalidateCommandDefinitions() {
  if (isInvalidatedDefinitions) return;
  isInvalidatedDefinitions = true;
  await tick();

  isInvalidatedDefinitions = false;

  commands.update(dct => {
    let res = { ...dct };
    const values = Object.values(res) as GlobalCommand[];
    // test enabled for group commands
    for (const command of values) {
      if (!command.isGroupCommand) continue;
      const groupSources = values.filter(x => x.group == command.group && !x.isGroupCommand);

      for (const source of groupSources) {
        source.keyTextFromGroup = command.keyText;
      }
    }
    return res;
  });

  invalidateCommands();
}
