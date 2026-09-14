import { trackUsage, UsageAnalyticsEvent } from '../utility/usageAnalytics';
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
  /** Custom event for this command, or false when the completed operation records its own result. */
  usageAnalytics?: UsageAnalyticsEvent | ((...args: any[]) => UsageAnalyticsEvent | undefined) | false;
}

function normalizeAnalyticsName(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function getDefaultCommandUsage(commandId: string): UsageAnalyticsEvent {
  const [featurePart, ...actionParts] = commandId.split('.');
  if (actionParts.length == 0) {
    return { feature: 'application', action: normalizeAnalyticsName(featurePart) || 'unknown' };
  }

  const feature = normalizeAnalyticsName(featurePart);
  return {
    feature: feature == 'app' ? 'application' : feature || 'application',
    action: normalizeAnalyticsName(actionParts.join('_')) || 'unknown',
  };
}

function trackCommandUsage(command: GlobalCommand, args: any[]): void {
  if (command.systemCommand || command.isGroupCommand || command.usageAnalytics === false) return;

  try {
    const event =
      typeof command.usageAnalytics == 'function'
        ? command.usageAnalytics(...args)
        : command.usageAnalytics || getDefaultCommandUsage(command.id);
    if (event) trackUsage(event);
  } catch {
    // Analytics metadata must never prevent the command from running.
  }
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
        // Wrap at registration so toolbar, palette, menu and keyboard paths agree.
        // Record invocation only: commands may open dialogs or start background work.
        onClick:
          command.onClick &&
          function (...args) {
            trackCommandUsage(command, args);
            return command.onClick.apply(this, args);
          },
        getSubCommands:
          command.getSubCommands &&
          (() =>
            command.getSubCommands().map(subCommand => ({
              ...subCommand,
              onClick: function (...args) {
                trackCommandUsage(command, args);
                return subCommand.onClick.apply(this, args);
              },
            }))),
        enabled: !testEnabled,
      },
    };
  });
  invalidateCommandDefinitions();
}
