import _ from 'lodash';
import { extractShellApiFunctionName, extractShellApiPlugins } from 'dbgate-tools';

export default class ScriptWriter {
  constructor(varCount) {
    this.s = '';
    this.packageNames = [];
    // this.engines = [];
    this.varCount = parseInt(varCount) || 0;
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
    this.put(`const ${variableName} = await ${extractShellApiFunctionName(functionName)}(${JSON.stringify(props)});`);
    this.packageNames.push(...extractShellApiPlugins(functionName, props));
  }

  copyStream(sourceVar, targetVar) {
    this.put(`await dbgateApi.copyStream(${sourceVar}, ${targetVar});`);
  }

  comment(s) {
    this.put(`// ${s}`);
  }

  getScript(extensions, schedule) {
    const packageNames = this.packageNames;
    let prefix = _.uniq(packageNames)
      .map((packageName) => `// @require ${packageName}\n`)
      .join('');
    if (schedule) prefix += `// @schedule ${schedule}`;
    if (prefix) prefix += '\n';

    return prefix + this.s;
  }
}
