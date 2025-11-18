import { commands } from '../stores';
import { invalidateCommandDefinitions } from './invalidateCommands';
import _ from 'lodash';
import { _tval, DefferedTranslationResult, isDefferedTranslationResult } from '../translations';

export interface SubCommand {
  text: string;
  onClick: Function;
}

export interface GlobalCommand {
  id: string;
  category: string | DefferedTranslationResult; // null for group commands
  isGroupCommand?: boolean;
  name: string | DefferedTranslationResult;
  text?: string | DefferedTranslationResult;
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
  toolbarName?: string | DefferedTranslationResult;
  menuName?: string | DefferedTranslationResult;
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
          isDefferedTranslationResult(command.category) || isDefferedTranslationResult(command.name)
            ? {
                _transCallback: () => `${_tval(command.category)}: ${_tval(command.name)}`,
              }
            : `${command.category}: ${command.name}`,
        ...command,
        enabled: !testEnabled,
      },
    };
  });
  invalidateCommandDefinitions();
}
