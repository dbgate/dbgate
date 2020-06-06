import ScriptWriter from './ScriptWriter';

export default class ScriptCreator {
  constructor() {
    this.varCount = 0;
    this.commands = [];
  }
  allocVariable(prefix = 'var') {
    this.varCount += 1;
    return `${prefix}${this.varCount}`;
  }
  getCode() {
    const writer = new ScriptWriter();
    for (const command of this.commands) {
      const { type } = command;
      switch (type) {
        case 'assign':
          {
            const { variableName, functionName, props } = command;
            writer.assign(variableName, functionName, props);
          }
          break;
        case 'copyStream':
          {
            const { sourceVar, targetVar } = command;
            writer.copyStream(sourceVar, targetVar);
          }
          break;
      }
    }
    writer.finish();
    return writer.s;
  }
  assign(variableName, functionName, props) {
    this.commands.push({
      type: 'assign',
      variableName,
      functionName,
      props,
    });
  }
  copyStream(sourceVar, targetVar) {
    this.commands.push({
      type: 'copyStream',
      sourceVar,
      targetVar,
    });
  }
}
