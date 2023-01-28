export interface ILogger {
  trace(msg: string);
  trace(data: {} | Error, msg: string);

  debug(msg: string);
  debug(data: {} | Error, msg: string);

  info(msg: string);
  info(data: {} | Error, msg: string);

  warn(msg: string);
  warn(data: {} | Error, msg: string);

  error(msg: string);
  error(data: {} | Error, msg: string);

  fatal(msg: string);
  fatal(data: {} | Error, msg: string);

  child(childProps: {}): ILogger;
  log(record: ILogRecord);
}

export interface ILogRecord {
  time: number;
  level: number;
  msg: string;
  pid?: number;
}

class PinoLikeLogger implements ILogger {
  constructor(public config: ILogConfig) {}

  trace(msg: string);
  trace(data: {} | Error, msg: string);
  trace(data, msg?) {
    this.log(this.packRecord(logLevelNumbers.trace, data, msg));
  }
  debug(msg: string);
  debug(data: {} | Error, msg: string);
  debug(data, msg?) {
    this.log(this.packRecord(logLevelNumbers.debug, data, msg));
  }
  info(msg: string);
  info(data: {} | Error, msg: string);
  info(data, msg?) {
    this.log(this.packRecord(logLevelNumbers.info, data, msg));
  }
  warn(msg: string);
  warn(data: {} | Error, msg: string);
  warn(data, msg?) {
    this.log(this.packRecord(logLevelNumbers.warn, data, msg));
  }
  error(msg: string);
  error(data: {} | Error, msg: string);
  error(data, msg?) {
    this.log(this.packRecord(logLevelNumbers.error, data, msg));
  }
  fatal(msg: string);
  fatal(data: {} | Error, msg: string);
  fatal(data, msg?) {
    this.log(this.packRecord(logLevelNumbers.fatal, data, msg));
  }

  packRecord(level: number, data, msg?): ILogRecord {
    if (msg) {
      return {
        ...this.config.base,
        ...data,
        level,
        msg,
        time: new Date().getTime(),
      };
    }
    return {
      ...this.config.base,
      level,
      msg: data,
      time: new Date().getTime(),
    };
  }

  log(record: ILogRecord) {
    for (const target of this.config.targets) {
      if (record.level < logLevelNames[target.level]) {
        continue;
      }
      switch (target.type) {
        case 'console':
          console.log(JSON.stringify(record));
          break;
        case 'stream':
          target.stream.write(JSON.stringify(record) + '\n');
          break;
      }
    }
  }

  child(childProps: {}): ILogger {
    return new PinoLikeLogger({
      ...this.config,
      base: { ...this.config.base, ...childProps },
    });
  }
}

export const logLevelNames = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

export const logLevelNumbers = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

interface ILogTargetConfig {
  level: keyof typeof logLevelNumbers;
  type: 'console' | 'stream';
  stream?: any;
}

interface ILogConfig {
  base: {};
  targets: ILogTargetConfig[];
}

export function createPinoLikeLogger(config: ILogConfig): ILogger {
  return new PinoLikeLogger(config);
}
