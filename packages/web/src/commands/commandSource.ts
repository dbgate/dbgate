/**
 * How the currently running command was invoked. Used only as a usage analytics dimension,
 * so it is valid for the synchronous part of the command's handler.
 */
let commandSource: string = null;

/** toolbar / menu / keyboard / palette, or command when the invoker is not known. */
export function getCommandSource(): string {
  return commandSource || 'command';
}

export function runWithCommandSource<T>(source: string, callback: () => T): T {
  const previous = commandSource;
  commandSource = source;
  try {
    return callback();
  } finally {
    commandSource = previous;
  }
}
