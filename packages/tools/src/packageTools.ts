import type { EngineDriver, ExtensionsDirectory } from 'dbgate-types';
import _camelCase from 'lodash/camelCase';
import _isString from 'lodash/isString';
import _isPlainObject from 'lodash/isPlainObject';

export function extractShellApiPlugins(functionName, props): string[] {
  const res = [];
  const nsMatch = functionName.match(/^([^@]+)@([^@]+)/);
  if (nsMatch) {
    res.push(nsMatch[2]);
  }
  if (props && props.connection && props.connection.engine) {
    const nsMatchEngine = props.connection.engine.match(/^([^@]+)@([^@]+)/);
    if (nsMatchEngine) {
      res.push(nsMatchEngine[2]);
    }
  }
  return res;
}

export function extractPackageName(name): string {
  if (!name) return null;
  const nsMatch = name.match(/^([^@]+)@([^@]+)/);
  if (nsMatch) {
    return nsMatch[2];
  }
  return null;
}

export function extractShellApiFunctionName(functionName) {
  const nsMatch = functionName.match(/^([^@]+)@([^@]+)/);
  if (nsMatch) {
    return `${_camelCase(nsMatch[2])}.shellApi.${nsMatch[1]}`;
  }
  return `dbgateApi.${functionName}`;
}

export function findEngineDriver(connection, extensions: ExtensionsDirectory): EngineDriver {
  if (!extensions) {
    return null;
  }
  if (_isString(connection)) {
    return extensions.drivers.find(x => x.engine == connection);
  }
  if (_isPlainObject(connection)) {
    const { engine } = connection;
    if (engine) {
      return extensions.drivers.find(x => x.engine == engine);
    }
  }
  return null;
}
