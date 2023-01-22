import pino, { Logger } from 'pino';

let _logger: Logger;
let _name: string = null;
const defaultLogger: Logger = pino({ redact: { paths: ['hostname'], remove: true } });

export function setLogger(value: Logger) {
  _logger = value;
}

export function getLogger(caller?: string): Logger {
  let res = _logger || defaultLogger;
  if (caller) {
    const props = { caller };
    if (_name) {
      props['name'] = _name;
    }
    res = res.child(props);
  }
  return res;
}

export function setLoggerName(value) {
  _name = value;
}
