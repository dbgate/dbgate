import { commands } from '../stores';

export interface SubCommand {
  text: string;
  onClick: Function;
}

export interface GlobalCommand {
  id: string;
  category: string;
  name: string;
  text?: string /* category: name */;
  keyText?: string;
  getSubCommands?: () => SubCommand[];
  onClick?: Function;
  enabledStore?: any;
  icon?: string;
  toolbar?: boolean;
  enabled?: boolean;
  showDisabled?: boolean;
  toolbarName?: string;
  toolbarOrder?: number;
  disableHandleKeyText?: string;
}

export default function registerCommand(command: GlobalCommand) {
  const { enabledStore } = command;
  commands.update(x => ({
    ...x,
    [command.id]: {
      text: `${command.category}: ${command.name}`,
      ...command,
      enabled: !enabledStore,
    },
  }));
  if (enabledStore) {
    enabledStore.subscribe(value => {
      commands.update(x => ({
        ...x,
        [command.id]: {
          ...x[command.id],
          enabled: value,
        },
      }));
    });
  }
}
