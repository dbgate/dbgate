import pinomin, { Logger, type LogConfig } from 'pinomin';

let _logConfig: LogConfig;
let _name: string = null;

const defaultLogConfig: LogConfig = {
  base: { pid: global?.process?.pid },
  targets: [{ type: 'console', level: 'info' }],
};

export function setLogConfig(value: LogConfig) {
  _logConfig = value;
}
export function setLoggerName(value) {
  _name = value;
}

export function getLogger(caller?: string): Logger {
  return pinomin({
    getConfig: () => {
      const config = _logConfig || defaultLogConfig;

      if (caller) {
        const props = { caller };
        if (_name) {
          props['name'] = _name;
        }
        return {
          ...config,
          base: {
            ...config.base,
            ...props,
          },
        };
      }

      return config;
    },
  });
}
