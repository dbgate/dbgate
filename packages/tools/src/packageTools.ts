import _ from 'lodash';

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
    return `${_.camelCase(nsMatch[2])}.shellApi.${nsMatch[1]}`;
  }
  return `dbgateApi.${functionName}`;
}
