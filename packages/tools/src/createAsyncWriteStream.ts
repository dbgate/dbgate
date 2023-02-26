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
    try {
      await options.processItem(chunk);
      callback(null);
    } catch (err) {
      callback(err);
    }
  };

  // writable._final = async callback => {
  //   callback();
  // };

  return writable;
}
