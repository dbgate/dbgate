import pino, { Logger } from 'pino';

let _logger: Logger;
const defaultLogger: Logger = pino();

export function setLogger(value: Logger) {
  _logger = value;
}

export function getLogger(): Logger {
  return _logger || defaultLogger;
}
