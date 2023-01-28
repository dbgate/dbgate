import pinomin, { Logger } from 'pinomin';

let _logger: Logger;
let _name: string = null;
const defaultLogger: Logger = pinomin({
  base: { pid: global?.process?.pid },
  targets: [{ type: 'console', level: 'info' }],
});

export function setLogger(value: Logger) {
  _logger = value;
}
export function setLoggerName(value) {
  _name = value;
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
