import { tick } from 'svelte';
import { commands } from '../stores';

let isInvalidated = false;

export default async function invalidateCommands() {
  if (isInvalidated) return;
  isInvalidated = true;
  await tick();

  isInvalidated = false;

  commands.update(dct => {
    let res = null;
    for (const key of Object.keys(dct)) {
      const command = dct[key];
      const { testEnabled } = command;
      let enabled = command.enabled;
      if (testEnabled) enabled = testEnabled();
      if (enabled != command.enabled) {
        if (!res) res = { ...dct };
        res[key] = {
          ...command,
          enabled,
        };
      }
    }
    return res || dct;
  });
}
