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
    inserts: { field: string; value: string, ttl: number }[];
    updates: { field: string; value: string, ttl: number }[];
    deletes: string[];
}

export interface ChangeSetRedis_List {
    key: string;
    type: 'list';
    inserts: { index: number; value: string }[];
    updates: { index: number; value: string }[];
    deletes: number[];
}

export interface ChangeSetRedis_Set {
    key: string;
    type: 'set';
    inserts: string[];
    deletes: string[];
}

export interface ChangeSetRedis_ZSet {
    key: string;
    type: 'zset';
    inserts: { member: string; score: number }[];
    updates: { member: string; score: number }[];
    deletes: string[];
}

export type ChangeSetRedisType =
  | ChangeSetRedis_String
  | ChangeSetRedis_JSON
  | ChangeSetRedis_Hash
  | ChangeSetRedis_List
  | ChangeSetRedis_Set
  | ChangeSetRedis_ZSet;


export interface ChangeSetRedis {
    changes: ChangeSetRedisType[];
}
