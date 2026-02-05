import { DatabaseMethodCallItem, DatabaseMethodCallList } from 'dbgate-types';

export interface ChangeSetRedis_String {
  key: string;
  type: 'string';
  value: string;
}

export interface ChangeSetRedis_JSON {
  key: string;
  type: 'json';
  value: string;
}

export interface ChangeSetRedis_Hash {
  key: string;
  type: 'hash';
  inserts: { key: string; value: string; ttl: number; editorRowId: string }[];
  updates: { key: string; value: string; ttl: number }[];
  deletes: string[];
}

export interface ChangeSetRedis_List {
  key: string;
  type: 'list';
  inserts: { value: string; editorRowId: string }[];
  updates: { index: number; value: string }[];
  deletes: number[];
}

export interface ChangeSetRedis_Set {
  key: string;
  type: 'set';
  inserts: { value: string; editorRowId: string }[];
  deletes: string[];
}

export interface ChangeSetRedis_ZSet {
  key: string;
  type: 'zset';
  inserts: { member: string; score: number; editorRowId: string }[];
  updates: { member: string; score: number }[];
  deletes: string[];
}

export interface ChangeSetRedis_Stream {
  key: string;
  type: 'stream';
  generatedId?: string;
  inserts: { field: string; value: string; editorRowId: string }[];
  deletes: string[];
}

export type ChangeSetRedisType =
  | ChangeSetRedis_String
  | ChangeSetRedis_JSON
  | ChangeSetRedis_Hash
  | ChangeSetRedis_List
  | ChangeSetRedis_Set
  | ChangeSetRedis_ZSet
  | ChangeSetRedis_Stream;

export interface ChangeSetRedis {
  changes: ChangeSetRedisType[];
}

export function redisChangeSetToRedisCommands(changeSet: ChangeSetRedis): DatabaseMethodCallList {
  const calls: DatabaseMethodCallItem[] = [];

  for (const change of changeSet.changes) {
    if (change.type === 'string') {
      calls.push({
        method: 'SET',
        args: [change.key, change.value],
      });
    } else if (change.type === 'json') {
      calls.push({
        method: 'JSON.SET',
        args: [change.key, '$', change.value],
      });
    } else if (change.type === 'hash') {
      if (change.updates && Array.isArray(change.updates)) {
        for (const update of change.updates) {
          calls.push({
            method: 'HSET',
            args: [change.key, update.key, update.value],
          });

          if (update.ttl !== undefined && update.ttl !== null && update.ttl !== -1) {
            calls.push({
              method: 'HEXPIRE',
              args: [change.key, update.ttl, 'FIELDS', 1, update.key],
            });
          }
        }
      }

      if (change.inserts && Array.isArray(change.inserts)) {
        for (const insert of change.inserts) {
          calls.push({
            method: 'HSET',
            args: [change.key, insert.key, insert.value],
          });

          if (insert.ttl !== undefined && insert.ttl !== null && insert.ttl !== -1) {
            calls.push({
              method: 'HEXPIRE',
              args: [change.key, insert.ttl, 'FIELDS', 1, insert.key],
            });
          }
        }
      }

      if (change.deletes && Array.isArray(change.deletes)) {
        for (const delKey of change.deletes) {
          calls.push({
            method: 'HDEL',
            args: [change.key, delKey],
          });
        }
      }
    } else if (change.type === 'zset') {
      if (change.updates && Array.isArray(change.updates)) {
        for (const update of change.updates) {
          calls.push({
            method: 'ZADD',
            args: [change.key, update.score, update.member],
          });
        }
      }

      if (change.inserts && Array.isArray(change.inserts)) {
        for (const insert of change.inserts) {
          calls.push({
            method: 'ZADD',
            args: [change.key, insert.score, insert.member],
          });
        }
      }

      if (change.deletes && Array.isArray(change.deletes)) {
        for (const delMember of change.deletes) {
          calls.push({
            method: 'ZREM',
            args: [change.key, delMember],
          });
        }
      }
    } else if (change.type === 'list') {
      if (change.updates && Array.isArray(change.updates)) {
        for (const update of change.updates) {
          calls.push({
            method: 'LSET',
            args: [change.key, update.index, update.value],
          });
        }
      }

      if (change.inserts && Array.isArray(change.inserts)) {
        for (const insert of change.inserts) {
          calls.push({
            method: 'RPUSH',
            args: [change.key, insert.value],
          });
        }
      }
    } else if (change.type === 'set') {
      if (change.inserts && Array.isArray(change.inserts)) {
        for (const insert of change.inserts) {
          calls.push({
            method: 'SADD',
            args: [change.key, insert.value],
          });
        }
      }

      if (change.deletes && Array.isArray(change.deletes)) {
        for (const delValue of change.deletes) {
          calls.push({
            method: 'SREM',
            args: [change.key, delValue],
          });
        }
      }
    } else if (change.type === 'stream') {
      if (change.inserts.length > 0) {
        calls.push({
          method: 'XADD',
          args: [change.key, change.generatedId || '*', ...change.inserts.flatMap(f => [f.field, f.value])],
        });
      }
      for (const delValue of change.deletes) {
        calls.push({
          method: 'XDEL',
          args: [change.key, delValue],
        });
      }
    }
  }

  return { calls };
}

export function convertRedisCallListToScript(callList: DatabaseMethodCallList): string {
  let script = '';
  for (const call of callList.calls) {
    script += `${call.method} ${call.args.map(arg => (typeof arg === 'string' ? `"${arg}"` : arg)).join(' ')}\n`;
  }
  return script;
}
