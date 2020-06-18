export default class ScriptWriter {
  constructor() {
    this.s = '';
    this.varCount = 0;
  }

  allocVariable(prefix = 'var') {
    this.varCount += 1;
    return `${prefix}${this.varCount}`;
  }

  put(s = '') {
    this.s += s;
    this.s += '\n';
  }

  assign(variableName, functionName, props) {
    this.put(`const ${variableName} = await dbgateApi.${functionName}(${JSON.stringify(props)});`);
  }

  copyStream(sourceVar, targetVar) {
    this.put(`await dbgateApi.copyStream(${sourceVar}, ${targetVar});`);
  }

  comment(s) {
    this.put(`// ${s}`);
  }
}
