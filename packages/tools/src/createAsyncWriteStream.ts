import _intersection from 'lodash/intersection';
import _isArray from 'lodash/isArray';
import { getLogger } from './getLogger';

const logger = getLogger('asyncWriteStream');

export interface AsyncWriteStreamOptions {
  processItem: (chunk: any) => Promise<void>;
}

export function createAsyncWriteStream(stream, options: AsyncWriteStreamOptions): any {
  const writable = new stream.Writable({
    objectMode: true,
  });

  writable._write = async (chunk, encoding, callback) => {
    await options.processItem(chunk);

    // const { sql, id, newIdSql } = chunk;
    // if (_isArray(sql)) {
    //   for (const item of sql) await driver.query(pool, item, { discardResult: true });
    // } else {
    //   await driver.query(pool, sql, { discardResult: true });
    // }
    // if (newIdSql) {
    //   const res = await driver.query(pool, newIdSql);
    //   const resId = Object.entries(res?.rows?.[0])?.[0]?.[1];

    //   if (options?.mapResultId) {
    //     options?.mapResultId(id, resId as string);
    //   }
    // }
    callback();
  };

  // writable._final = async callback => {
  //   callback();
  // };

  return writable;
}
