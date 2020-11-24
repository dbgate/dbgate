import _camelCase from 'lodash/camelCase';

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

export function extractShellApiFunctionName(functionName) {
  const nsMatch = functionName.match(/^([^@]+)@([^@]+)/);
  if (nsMatch) {
    return `${_camelCase(nsMatch[2])}.shellApi.${nsMatch[1]}`;
  }
  return `dbgateApi.${functionName}`;
}
