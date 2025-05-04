import _uniq from 'lodash/uniq';
import _cloneDeepWith from 'lodash/cloneDeepWith';
import { evalShellApiFunctionName, compileShellApiFunctionName, extractShellApiPlugins } from './packageTools';

export interface ScriptWriterGeneric {
  allocVariable(prefix?: string);
  endLine();
  assign(variableName: string, functionName: string, props: any);
  assignValue(variableName: string, jsonValue: any);
  requirePackage(packageName: string);
  copyStream(sourceVar: string, targetVar: string, colmapVar?: string, progressName?: string);
  importDatabase(options: any);
  dataReplicator(options: any);
  comment(s: string);
  zipDirectory(inputDirectory: string, outputFile: string);
  getScript(schedule?: any): any;
}

export class ScriptWriterJavaScript implements ScriptWriterGeneric {
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
    this.assignCore(variableName, compileShellApiFunctionName(functionName), props);
    this.packageNames.push(...extractShellApiPlugins(functionName, props));
  }

  assignValue(variableName, jsonValue) {
    this._put(`const ${variableName} = ${JSON.stringify(jsonValue)};`);
  }

  requirePackage(packageName) {
    this.packageNames.push(packageName);
  }

  copyStream(sourceVar, targetVar, colmapVar = null, progressName?: string | { name: string; runid: string }) {
    let opts = '{';
    if (colmapVar) opts += `columns: ${colmapVar}, `;
    if (progressName) opts += `progressName: ${JSON.stringify(progressName)}, `;
    opts += '}';

    this._put(`await dbgateApi.copyStream(${sourceVar}, ${targetVar}, ${opts});`);
  }

  importDatabase(options) {
    this._put(`await dbgateApi.importDatabase(${JSON.stringify(options)});`);
  }

  dataReplicator(options) {
    this._put(`await dbgateApi.dataReplicator(${JSON.stringify(options, null, 2)});`);
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

  zipDirectory(inputDirectory, outputFile) {
    this._put(`await dbgateApi.zipDirectory('${inputDirectory}', '${outputFile}');`);
  }
}

export class ScriptWriterJson implements ScriptWriterGeneric {
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
      functionName,
      props,
    });

    this.packageNames.push(...extractShellApiPlugins(functionName, props));
  }

  requirePackage(packageName) {
    this.packageNames.push(packageName);
  }

  assignValue(variableName, jsonValue) {
    this.commands.push({
      type: 'assignValue',
      variableName,
      jsonValue,
    });
  }

  copyStream(sourceVar, targetVar, colmapVar = null, progressName?: string | { name: string; runid: string }) {
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

  dataReplicator(options) {
    this.commands.push({
      type: 'dataReplicator',
      options,
    });
  }

  zipDirectory(inputDirectory, outputFile) {
    this.commands.push({
      type: 'zipDirectory',
      inputDirectory,
      outputFile,
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

export class ScriptWriterEval implements ScriptWriterGeneric {
  s = '';
  varCount = 0;
  commands = [];
  dbgateApi: any;
  requirePlugin: (name: string) => any;
  variables: { [name: string]: any } = {};
  hostConnection: any;
  runid: string;

  constructor(dbgateApi, requirePlugin, hostConnection, runid, varCount = '0') {
    this.varCount = parseInt(varCount) || 0;
    this.dbgateApi = dbgateApi;
    this.requirePlugin = requirePlugin;
    this.hostConnection = hostConnection;
    this.runid = runid;
  }

  allocVariable(prefix = 'var') {
    this.varCount += 1;
    return `${prefix}${this.varCount}`;
  }

  endLine() {}

  requirePackage(packageName) {}

  async assign(variableName, functionName, props) {
    const func = evalShellApiFunctionName(functionName, this.dbgateApi, this.requirePlugin);

    this.variables[variableName] = await func(
      _cloneDeepWith(props, node => {
        if (node?.$hostConnection) {
          return this.hostConnection;
        }
      })
    );
  }

  assignValue(variableName, jsonValue) {
    this.variables[variableName] = jsonValue;
  }

  async copyStream(sourceVar, targetVar, colmapVar = null, progressName?: string | { name: string; runid: string }) {
    await this.dbgateApi.copyStream(this.variables[sourceVar], this.variables[targetVar], {
      progressName: _cloneDeepWith(progressName, node => {
        if (node?.$runid) {
          if (node?.$runid) {
            return this.runid;
          }
        }
      }),
      columns: colmapVar ? this.variables[colmapVar] : null,
    });
  }

  comment(text) {}

  async importDatabase(options) {
    await this.dbgateApi.importDatabase(options);
  }

  async dataReplicator(options) {
    await this.dbgateApi.dataReplicator(options);
  }

  async zipDirectory(inputDirectory, outputFile) {
    await this.dbgateApi.zipDirectory(inputDirectory, outputFile);
  }

  getScript(schedule?: any) {
    throw new Error('Not implemented');
  }
}

async function playJsonCommand(cmd, script: ScriptWriterGeneric) {
  switch (cmd.type) {
    case 'assign':
      await script.assign(cmd.variableName, cmd.functionName, cmd.props);
      break;
    case 'assignValue':
      await script.assignValue(cmd.variableName, cmd.jsonValue);
      break;
    case 'copyStream':
      await script.copyStream(cmd.sourceVar, cmd.targetVar, cmd.colmapVar, cmd.progressName);
      break;
    case 'endLine':
      await script.endLine();
      break;
    case 'comment':
      await script.comment(cmd.text);
      break;
    case 'importDatabase':
      await script.importDatabase(cmd.options);
      break;
    case 'dataReplicator':
      await script.dataReplicator(cmd.options);
      break;
    case 'zipDirectory':
      await script.zipDirectory(cmd.inputDirectory, cmd.outputFile);
      break;
  }
}

export async function playJsonScriptWriter(json, script: ScriptWriterGeneric) {
  for (const cmd of json.commands) {
    await playJsonCommand(cmd, script);
  }
}

export async function jsonScriptToJavascript(json) {
  const { schedule, packageNames } = json;
  const script = new ScriptWriterJavaScript();
  for (const packageName of packageNames) {
    if (!/^dbgate-plugin-.*$/.test(packageName)) {
      throw new Error('Unallowed package name:' + packageName);
    }
    script.packageNames.push(packageName);
  }

  await playJsonScriptWriter(json, script);

  return script.getScript(schedule);
}
