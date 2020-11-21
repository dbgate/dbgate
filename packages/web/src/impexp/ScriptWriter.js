import _ from 'lodash';

export default class ScriptWriter {
  constructor() {
    this.s = '';
    this.packageNames = [];
    this.engines = [];
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
    const nsMatch = functionName.match(/^([^@]+)@([^@]+)/);
    if (nsMatch) {
      const packageName = nsMatch[2];
      if (!this.packageNames.includes(packageName)) {
        this.packageNames.push(packageName);
      }
      this.put(
        `const ${variableName} = await ${_.camelCase(packageName)}.shellApi.${nsMatch[1]}(${JSON.stringify(props)});`
      );
    } else {
      this.put(`const ${variableName} = await dbgateApi.${functionName}(${JSON.stringify(props)});`);
    }
    if (props && props.connection && props.connection.engine && !this.engines.includes(props.connection.engine)) {
      this.engines.push(props.connection.engine);
    }
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
    return packageNames.map((packageName) => `// @require ${packageName}\n`).join('') + '\n' + this.s;
  }
}
