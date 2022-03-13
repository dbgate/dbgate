import _ from 'lodash';
import { extractShellApiFunctionName, extractShellApiPlugins } from 'dbgate-tools';

export default class ScriptWriter {
  s = '';
  packageNames: string[] = [];
  varCount = 0;

  constructor(varCount = '0') {
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

  assignValue(variableName, jsonValue) {
    this.put(`const ${variableName} = ${JSON.stringify(jsonValue)};`);
  }

  requirePackage(packageName) {
    this.packageNames.push(packageName);
  }

  copyStream(sourceVar, targetVar, colmapVar = null) {
    if (colmapVar) {
      this.put(`await dbgateApi.copyStream(${sourceVar}, ${targetVar}, {columns: ${colmapVar}});`);
    } else {
      this.put(`await dbgateApi.copyStream(${sourceVar}, ${targetVar});`);
    }
  }

  comment(s) {
    this.put(`// ${s}`);
  }

  getScript(schedule = null) {
    const packageNames = this.packageNames;
    let prefix = _.uniq(packageNames)
      .map(packageName => `// @require ${packageName}\n`)
      .join('');
    if (schedule) prefix += `// @schedule ${schedule}`;
    if (prefix) prefix += '\n';

    return prefix + this.s;
  }
}
