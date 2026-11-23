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
        const resolve = this.resolve;
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
        const resolve = this.resolve;
        this.resolve = null;
        this.isEnded = true;
        resolve(null);
        return;
      }
      this.queue.enqueue(null);
    };
    this.lineStream.on('end', onEnd);
    this.lineStream.on('close', onEnd);
    input.on('error', onEnd);
  }

  readLine() {
    if (this.isEnded) {
      return Promise.resolve(null);
    }

    if (!this.queue.isEmpty()) {
      const res = this.queue.dequeue();
      if (res == null) this.isEnded = true;
      return Promise.resolve(res);
    }

    this.lineStream.resume();

    return new Promise(resolve => {
      this.resolve = resolve;
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
