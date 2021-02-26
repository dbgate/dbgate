import { commands } from '../stores';

export interface SubCommand {
  text: string;
  onClick: Function;
}

export interface GlobalCommand {
  id: string;
  category: string;
  name: string;
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
}

export default function registerCommand(command: GlobalCommand) {
  const { enabledStore } = command;
  commands.update(x => ({
    ...x,
    [command.id]: {
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
