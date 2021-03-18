import { commands } from '../stores';
import invalidateCommands from './invalidateCommands';

export interface SubCommand {
  text: string;
  onClick: Function;
}

export interface GlobalCommand {
  id: string;
  category: string; // null for group commands
  isGroupCommand?: boolean;
  name: string;
  text?: string /* category: name */;
  keyText?: string;
  keyTextFromGroup?: string; // automatically filled from group
  group?: string;
  getSubCommands?: () => SubCommand[];
  onClick?: Function;
  testEnabled?: () => boolean;
  // enabledStore?: any;
  icon?: string;
  toolbar?: boolean;
  enabled?: boolean;
  showDisabled?: boolean;
  toolbarName?: string;
  menuName?: string;
  toolbarOrder?: number;
  disableHandleKeyText?: string;
}

export default function registerCommand(command: GlobalCommand) {
  const { testEnabled } = command;
  commands.update(x => ({
    ...x,
    [command.id]: {
      text: `${command.category}: ${command.name}`,
      ...command,
      enabled: !testEnabled,
    },
  }));
  invalidateCommands();
  // if (enabledStore) {
  //   enabledStore.subscribe(value => {
  //     commands.update(x => ({
  //       ...x,
  //       [command.id]: {
  //         ...x[command.id],
  //         enabled: value,
  //       },
  //     }));
  //   });
  // }
}
