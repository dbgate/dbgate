import { createPinoLikeLogger, ILogger } from './pinomin';

let _logger: ILogger;
let _name: string = null;
const defaultLogger: ILogger = createPinoLikeLogger({
  pid: global?.process?.pid,
  targets: [{ type: 'console', level: 'info' }],
});

export function setLogger(value: ILogger) {
  _logger = value;
}
export function setLoggerName(value) {
  _name = value;
}

export function getLogger(caller?: string): ILogger {
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
