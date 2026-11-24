const { createLineStream } = require('./lineStream');

class Queue {
  constructor() {
    this.elements = {};
    this.head = 0;
    this.tail = 0;
  }
  enqueue(element) {
    this.elements[this.tail] = element;
    this.tail++;
  }
  dequeue() {
    const item = this.elements[this.head];
    delete this.elements[this.head];
    this.head++;
    return item;
  }
  peek() {
    return this.elements[this.head];
  }
  getLength() {
    return this.tail - this.head;
  }
  isEmpty() {
    return this.getLength() === 0;
  }
}

class LineReader {
  constructor(input) {
    this.input = input;
    this.queue = new Queue();
    this.resolve = null;
    this.isEnded = false;
    // don't use Node readline - it splits lines also on U+2028/U+2029, which JSON.stringify
    // writes unescaped, so JSONL rows containing them would be broken
    this.lineStream = createLineStream(input);
    this.lineStream.pause();

    this.lineStream.on('data', lineBuffer => {
      this.lineStream.pause();
      const line = lineBuffer.toString();
      if (this.resolve) {
        const { resolve } = this.resolve;
        this.resolve = null;
        resolve(line);
        return;
      }
      this.queue.enqueue(line);
    });

    const onEnd = () => {
      if (this.endEmitted) return;
      this.endEmitted = true;
      if (this.resolve) {
        const { resolve } = this.resolve;
        this.resolve = null;
        this.isEnded = true;
        resolve(null);
        return;
      }
      this.queue.enqueue(null);
    };

    // read failure must not look like EOF - callers would silently return partial data
    const onError = err => {
      if (this.error) return;
      this.error = err;
      this.endEmitted = true;
      this.lineStream.destroy();
      if (this.resolve) {
        const { reject } = this.resolve;
        this.resolve = null;
        reject(err);
      }
    };
    this.lineStream.on('end', onEnd);
    this.lineStream.on('close', () => {
      if (!this.error) onEnd();
    });
    this.lineStream.on('error', onError);
    input.on('error', onError);
  }

  readLine() {
    if (this.error) {
      return Promise.reject(this.error);
    }
    if (this.isEnded) {
      return Promise.resolve(null);
    }

    if (!this.queue.isEmpty()) {
      const res = this.queue.dequeue();
      if (res == null) this.isEnded = true;
      return Promise.resolve(res);
    }

    this.lineStream.resume();

    return new Promise((resolve, reject) => {
      this.resolve = { resolve, reject };
    });
  }

  close() {
    this.isEnded = true;
    this.input.unpipe(this.lineStream);
    this.lineStream.destroy();
    this.queue = new Queue();
    return new Promise(resolve => this.input.close(resolve));
  }
}

module.exports = LineReader;
