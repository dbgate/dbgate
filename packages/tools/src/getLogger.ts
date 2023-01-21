import pino, { Logger } from 'pino';

let _logger: Logger;
const defaultLogger: Logger = pino();

export function setLogger(value: Logger) {
  _logger = value;
}

export function getLogger(caller?: string): Logger {
  let res = _logger || defaultLogger;
  if (caller) {
    res = res.child({ caller });
  }
  return res;
}
