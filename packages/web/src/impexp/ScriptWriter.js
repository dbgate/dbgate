import _ from 'lodash';
import { extractShellApiFunctionName, extractShellApiPlugins } from 'dbgate-tools';

export default class ScriptWriter {
  constructor() {
    this.s = '';
    this.packageNames = [];
    // this.engines = [];
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
    this.put(`const ${variableName} = await ${extractShellApiFunctionName(functionName)}(${JSON.stringify(props)});`);
    this.packageNames.push(...extractShellApiPlugins(functionName, props));
  }

  copyStream(sourceVar, targetVar) {
    this.put(`await dbgateApi.copyStream(${sourceVar}, ${targetVar});`);
  }

  comment(s) {
    this.put(`// ${s}`);
  }

  getScript(extensions) {
    // if (this.packageNames.length > 0) {
    //   this.comment('@packages');
    //   this.comment(JSON.stringify(this.packageNames));
    // }
    // if (this.engines.length > 0) {
    //   this.comment('@engines');
    //   this.comment(JSON.stringify(this.engines));
    // }
    const packageNames = this.packageNames;
    return (
      _.uniq(packageNames)
        .map((packageName) => `// @require ${packageName}\n`)
        .join('') +
      '\n' +
      this.s
    );
  }
}
