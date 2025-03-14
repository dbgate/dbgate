import _uniq from 'lodash/uniq';
import { extractShellApiFunctionName, extractShellApiPlugins } from './packageTools';

export class ScriptWriter {
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

  _put(s = '') {
    this.s += s;
    this.s += '\n';
  }

  endLine() {
    this._put();
  }

  assignCore(variableName, functionName, props) {
    this._put(`const ${variableName} = await ${functionName}(${JSON.stringify(props)});`);
  }

  assign(variableName, functionName, props) {
    this.assignCore(variableName, extractShellApiFunctionName(functionName), props);
    this.packageNames.push(...extractShellApiPlugins(functionName, props));
  }

  assignValue(variableName, jsonValue) {
    this._put(`const ${variableName} = ${JSON.stringify(jsonValue)};`);
  }

  requirePackage(packageName) {
    this.packageNames.push(packageName);
  }

  copyStream(sourceVar, targetVar, colmapVar = null, progressName?: string) {
    let opts = '{';
    if (colmapVar) opts += `columns: ${colmapVar}, `;
    if (progressName) opts += `progressName: "${progressName}", `;
    opts += '}';

    this._put(`await dbgateApi.copyStream(${sourceVar}, ${targetVar}, ${opts});`);
  }

  importDatabase(options) {
    this._put(`await dbgateApi.importDatabase(${JSON.stringify(options)});`);
  }

  dataDuplicator(options) {
    this._put(`await dbgateApi.dataDuplicator(${JSON.stringify(options, null, 2)});`);
  }

  comment(s) {
    this._put(`// ${s}`);
  }

  getScript(schedule = null) {
    const packageNames = this.packageNames;
    let prefix = _uniq(packageNames)
      .map(packageName => `// @require ${packageName}\n`)
      .join('');
    if (schedule) prefix += `// @schedule ${schedule}`;
    if (prefix) prefix += '\n';

    return prefix + this.s;
  }
}

export class ScriptWriterJson {
  s = '';
  packageNames: string[] = [];
  varCount = 0;
  commands = [];

  constructor(varCount = '0') {
    this.varCount = parseInt(varCount) || 0;
  }

  allocVariable(prefix = 'var') {
    this.varCount += 1;
    return `${prefix}${this.varCount}`;
  }

  endLine() {
    this.commands.push({
      type: 'endline',
    });
  }

  assign(variableName, functionName, props) {
    this.commands.push({
      type: 'assign',
      variableName,
      functionName: extractShellApiFunctionName(functionName),
      props,
    });

    this.packageNames.push(...extractShellApiPlugins(functionName, props));
  }

  assignValue(variableName, jsonValue) {
    this.commands.push({
      type: 'assignValue',
      variableName,
      jsonValue,
    });
  }

  copyStream(sourceVar, targetVar, colmapVar = null, progressName?: string) {
    this.commands.push({
      type: 'copyStream',
      sourceVar,
      targetVar,
      colmapVar,
      progressName,
    });
  }

  comment(text) {
    this.commands.push({
      type: 'comment',
      text,
    });
  }

  importDatabase(options) {
    this.commands.push({
      type: 'importDatabase',
      options,
    });
  }

  dataDuplicator(options) {
    this.commands.push({
      type: 'dataDuplicator',
      options,
    });
  }

  getScript(schedule = null) {
    return {
      type: 'json',
      schedule,
      commands: this.commands,
      packageNames: this.packageNames,
    };
  }
}

export function jsonScriptToJavascript(json) {
  const { schedule, commands, packageNames } = json;
  const script = new ScriptWriter();
  for (const packageName of packageNames) {
    if (!/^dbgate-plugin-.*$/.test(packageName)) {
      throw new Error('Unallowed package name:' + packageName);
    }
    script.packageNames.push(packageName);
  }

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'assign':
        script.assignCore(cmd.variableName, cmd.functionName, cmd.props);
        break;
      case 'assignValue':
        script.assignValue(cmd.variableName, cmd.jsonValue);
        break;
      case 'copyStream':
        script.copyStream(cmd.sourceVar, cmd.targetVar, cmd.colmapVar, cmd.progressName);
        break;
      case 'endLine':
        script.endLine();
        break;
      case 'comment':
        script.comment(cmd.text);
        break;
      case 'importDatabase':
        script.importDatabase(cmd.options);
        break;
      case 'dataDuplicator':
        script.dataDuplicator(cmd.options);
        break;
    }
  }

  return script.getScript(schedule);
}
