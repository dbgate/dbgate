import { DatabaseInfo, DatabaseInfoObjects } from 'dbgate-types';

export function fullNameFromString(name) {
  const m = name.match(/\[([^\]]+)\]\.\[([^\]]+)\]/);
  if (m) {
    return {
      schemaName: m[1],
      pureName: m[2],
    };
  }
  return {
    schemaName: null,
    pureName: name,
  };
}

export function fullNameToString({ schemaName, pureName }) {
  if (schemaName) {
    return `[${schemaName}].[${pureName}]`;
  }
  return pureName;
}

export function quoteFullName(dialect, { schemaName, pureName }) {
  if (schemaName) return `${dialect.quoteIdentifier(schemaName)}.${dialect.quoteIdentifier(pureName)}`;
  return `${dialect.quoteIdentifier(pureName)}`;
}

export function equalStringLike(s1, s2) {
  return (s1 || '').toLowerCase().trim() == (s2 || '').toLowerCase().trim();
}

export function findObjectLike(
  { pureName, schemaName },
  dbinfo: DatabaseInfo,
  objectTypeField: keyof DatabaseInfoObjects
) {
  if (!dbinfo) return null;
  if (schemaName) {
    // @ts-ignore
    return dbinfo[objectTypeField].find(
      (x) => equalStringLike(x.pureName, pureName) && equalStringLike(x.schemaName, schemaName)
    );
  }
  // @ts-ignore
  return dbinfo[objectTypeField].find((x) => equalStringLike(x.pureName, pureName));
}
