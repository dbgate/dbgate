import { commands } from '../stores';
import { invalidateCommandDefinitions } from './invalidateCommands';
import _ from 'lodash';

export interface SubCommand {
  text: string;
  onClick: Function;
}

export interface GlobalCommand {
  id: string;
  category: string | (() => string); // null for group commands
  isGroupCommand?: boolean;
  name: string | (() => string);
  text?: string | (() => string);
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
  toolbarName?: string | (() => string);
  menuName?: string;
  toolbarOrder?: number;
  disableHandleKeyText?: string;
  isRelatedToTab?: boolean;
  systemCommand?: boolean;
}

export default function registerCommand(command: GlobalCommand) {
  const { testEnabled } = command;
  commands.update(x => {
    if (x[command.id]) {
      console.error(`Command ${command.id} already registered`);
      return x;
    }
    return {
      ...x,
      [command.id]: {
        text:
          _.isFunction(command.category) || _.isFunction(command.name)
            ? () =>
                `${_.isFunction(command.category) ? command.category() : command.category}: ${
                  _.isFunction(command.name) ? command.name() : command.name
                }`
            : `${command.category}: ${command.name}`,
        ...command,
        enabled: !testEnabled,
      },
    };
  });
  invalidateCommandDefinitions();
}
