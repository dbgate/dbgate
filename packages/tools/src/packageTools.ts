import type { EngineDriver, ExtensionsDirectory } from 'dbgate-types';
import _camelCase from 'lodash/camelCase';
import _isString from 'lodash/isString';
import _isPlainObject from 'lodash/isPlainObject';

const JS_IDENTIFIER_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

export function isValidJsIdentifier(name: string): boolean {
  return typeof name === 'string' && JS_IDENTIFIER_RE.test(name);
}

export function assertValidJsIdentifier(name: string, label: string): void {
  if (!isValidJsIdentifier(name)) {
    throw new Error(`DBGM-00000 Invalid ${label}: ${String(name).substring(0, 100)}`);
  }
}

/**
 * Validates a shell API function name.
 * Allowed forms:
 *   - "someFunctionName"  (plain identifier, resolved as dbgateApi.someFunctionName)
 *   - "funcName@dbgate-plugin-xxx"  (namespaced, resolved as plugin.shellApi.funcName)
 */
export function assertValidShellApiFunctionName(functionName: string): void {
  if (typeof functionName !== 'string') {
    throw new Error('DBGM-00000 functionName must be a string');
  }
  const nsMatch = functionName.match(/^([^@]+)@([^@]+)$/);
  if (nsMatch) {
    if (!isValidJsIdentifier(nsMatch[1])) {
      throw new Error(`DBGM-00000 Invalid function part in functionName: ${nsMatch[1].substring(0, 100)}`);
    }
    if (!/^dbgate-plugin-[a-zA-Z0-9_-]+$/.test(nsMatch[2])) {
      throw new Error(`DBGM-00000 Invalid plugin package in functionName: ${nsMatch[2].substring(0, 100)}`);
    }
  } else {
    if (!isValidJsIdentifier(functionName)) {
      throw new Error(`DBGM-00000 Invalid functionName: ${functionName.substring(0, 100)}`);
    }
  }
}

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

export function compileShellApiFunctionName(functionName) {
  assertValidShellApiFunctionName(functionName);
  const nsMatch = functionName.match(/^([^@]+)@([^@]+)$/);
  if (nsMatch) {
    return `${_camelCase(nsMatch[2])}.shellApi.${nsMatch[1]}`;
  }
  return `dbgateApi.${functionName}`;
}

export function evalShellApiFunctionName(functionName, dbgateApi, requirePlugin) {
  assertValidShellApiFunctionName(functionName);
  const nsMatch = functionName.match(/^([^@]+)@([^@]+)$/);
  if (nsMatch) {
    return requirePlugin(nsMatch[2]).shellApi[nsMatch[1]];
  }
  return dbgateApi[functionName];
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
