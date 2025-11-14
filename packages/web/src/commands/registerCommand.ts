import { commands } from '../stores';
import { invalidateCommandDefinitions } from './invalidateCommands';
import _ from 'lodash';
import { _val } from '../translations';

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
  menuName?: string | (() => string);
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
          _val(command.category) || _val(command.name)
            ? () =>
                `${_val(command.category)}: ${_val(command.name)}`
            : `${command.category}: ${command.name}`,
        ...command,
        enabled: !testEnabled,
      },
    };
  });
  invalidateCommandDefinitions();
}
