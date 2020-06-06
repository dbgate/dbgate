export default class ScriptWriter {
  constructor() {
    this.s = '';
    this.put('const dbgateApi = require("@dbgate/api");');
    this.put('async function run() {');
  }

  put(s) {
    this.s += s;
    this.s += '\n';
  }

  finish() {
    this.put('await dbgateApi.copyStream(queryReader, csvWriter);');
    this.put('dbgateApi.runScript(run);');
    this.put('}');
  }

  assign(variableName, functionName, props) {
    this.put(`const ${variableName} = await dbgateApi.${functionName}(${JSON.stringify(props)});`);
  }

  copyStream(sourceVar, targetVar) {
    this.put(`await dbgateApi.copyStream(${sourceVar}, ${targetVar});`);
  }
}
